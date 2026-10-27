"use client";

import { ReactNode, RefObject, useEffect, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";

type LonLat = [number, number];

export type MapPoint = {
  id: number;
  city: string;
  ll: LonLat;
  color: string;
  today: boolean;
  tip: string;
};

export type MapHandle = {
  zoomTo: (lls: LonLat[], maxK?: number) => void;
  reset: () => void;
};

type Props = {
  points: MapPoint[];
  cityLabels: Record<string, string>;
  cityCenters: Record<string, LonLat>;
  selectedCity: string | null;
  highlightId: number | null;
  popupId: number | null;
  popup: ReactNode;
  onMarkerClick: (city: string, points: MapPoint[]) => void;
  onBackgroundClick: () => void;
  handleRef: RefObject<MapHandle | null>;
  className?: string;
};

type Cluster = {
  m: MapPoint[];
  x: number;
  y: number;
  whole: boolean;
  main: string;
  cities: string[];
  named: boolean;
  name: string;
  w: number;
  key: string;
  o?: [number, number];
};

type Unit = { m: MapPoint[]; x: number; y: number; whole: boolean; used?: boolean };
type Rect = [number, number, number, number];
type Label = { k: string; x: number; y: number; fs: number; t: string; sel?: boolean; nb?: boolean; sea?: boolean };

// hand-drawn water bodies (Kinneret, Dead Sea north + south basins) - the
// world atlas has no inland water at this scale
const LAKES: LonLat[][] = [
  [[35.53, 32.72], [35.57, 32.71], [35.61, 32.735], [35.625, 32.79], [35.615, 32.85], [35.585, 32.88], [35.55, 32.87], [35.53, 32.83], [35.522, 32.775]],
  [[35.47, 31.76], [35.53, 31.765], [35.57, 31.68], [35.575, 31.56], [35.545, 31.5], [35.5, 31.47], [35.455, 31.48], [35.43, 31.56], [35.44, 31.68]],
  [[35.405, 31.24], [35.43, 31.24], [35.44, 31.17], [35.415, 31.13], [35.395, 31.17]],
];
const BOATS = [
  { ll: [33.85, 32.25] as LonLat, c: "#c9552b", flip: false },
  { ll: [34.2, 33.05] as LonLat, c: "#3e6b4a", flip: true },
];
const NEIGHBORS: [string, LonLat][] = [
  ["מצרים", [33.9, 30.4]],
  ["ירדן", [35.95, 31.0]],
  ["לבנון", [35.62, 33.55]],
  ["סוריה", [36.15, 33.25]],
];

const ink = "#2a2a20";
const countLabel = (n: number) => (n === 1 ? "מוצר אחד" : `${n} מוצרים`);
const overlaps = (a: Rect, b: Rect) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];

function sailBoat(node: SVGGElement, flip: boolean, pos: d3.Selection<SVGGElement, unknown, null, undefined>) {
  const n = node as SVGGElement & { _busy?: boolean };
  if (n._busy) return;
  n._busy = true;
  const d = flip ? 1 : -1;
  n.animate(
    [
      { transform: "translate(0,0)" },
      { transform: `translate(${d * 46}px,-2px) rotate(${d * 4}deg)`, offset: 0.3 },
      { transform: `translate(${d * 50}px,0)`, offset: 0.55 },
      { transform: "translate(0,0)" },
    ],
    { duration: 3400, easing: "ease-in-out" }
  ).onfinish = () => {
    n._busy = false;
  };
  const wake = pos
    .append("path")
    .attr("d", "M-6 10 q6 -4 12 0")
    .attr("fill", "none")
    .attr("stroke", "#3e6b4a")
    .attr("stroke-width", 1.2)
    .style("pointer-events", "none");
  wake.transition().duration(900).attr("transform", `translate(${-d * 18},2)`).attr("opacity", 0).remove();
}

type MapApi = MapHandle & { paint: () => void; destroy: () => void };

// all of the d3 drawing lives outside React: it owns the SVG and reads the
// latest props through getProps() whenever it repaints
function mountMap(
  wrap: HTMLDivElement,
  svgEl: SVGSVGElement,
  tip: HTMLDivElement,
  pop: HTMLDivElement,
  getProps: () => Props
): MapApi {
  const svg = d3.select(svgEl);
  let geo: { land: d3.GeoPermissibleObjects; neighbors: d3.GeoPermissibleObjects } | null = null;
  let proj: d3.GeoProjection | null = null;
  let T = d3.zoomIdentity;
  let W = 0;
  let H = 0;
  let lastW = 0;
  let lastH = 0;
  let disposed = false;

  svg.html(`<defs>
<filter id="fs-ink"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="2"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter>
<filter id="fs-wash" filterRes="200"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .24  0 0 0 0 .42  0 0 0 0 .29  0 0 0 -1.1 .75"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<pattern id="fs-waves" width="46" height="26" patternUnits="userSpaceOnUse"><path d="M4 13 q5 -5 10 0 t10 0" fill="none" stroke="rgba(62,107,74,.45)" stroke-width="1.3" stroke-linecap="round"/><path d="M27 2 q4 -4 8 0" fill="none" stroke="rgba(62,107,74,.3)" stroke-width="1.1" stroke-linecap="round"/></pattern>
<clipPath id="fs-lakeclip"><path class="lakeclip"/></clipPath>
</defs>
<rect class="sea" fill="#cfd8c3"/><rect class="seawash" fill="#000" filter="url(#fs-wash)"/><rect class="seawv" fill="url(#fs-waves)"/>
<g class="world"><path class="nb" fill="#e4dcc4" stroke="rgba(42,42,32,.35)" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/>
<path class="land" fill="#f5edd6" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<path class="lakes" fill="#cfd8c3" stroke="${ink}" stroke-width="1.1" vector-effect="non-scaling-stroke"/></g>
<g clip-path="url(#fs-lakeclip)"><rect class="lakewv" fill="url(#fs-waves)"/></g><g class="deco"></g><g class="labels"></g><g class="marks"></g>`);

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 60])
    .clickDistance(8)
    .tapDistance(12)
    .on("zoom", (e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      T = e.transform;
      svg.select(".world").attr("transform", T.toString());
      svg.select(".lakeclip").attr("transform", T.toString());
      paint();
    });
  svg.call(zoom).on("dblclick.zoom", null);
  svg.on("click", (e: MouseEvent) => {
    if (!(e.target as Element).closest(".mk")) getProps().onBackgroundClick();
  });

  function zoomTo(lls: LonLat[], maxK = 28) {
    if (!proj) return;
    const p = lls.map((c) => proj!(c)!);
    const [x0, x1] = d3.extent(p, (a) => a[0]) as [number, number];
    const [y0, y1] = d3.extent(p, (a) => a[1]) as [number, number];
    const k = Math.max(1, Math.min(maxK, (W - 180) / Math.max(x1 - x0, 1), (H - 200) / Math.max(y1 - y0, 1)));
    svg
      .transition()
      .duration(850)
      .ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2 + 30).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
  }
  function reset() {
    svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity);
  }
  (wrap.querySelector(".zin") as HTMLButtonElement).onclick = () => svg.transition().duration(400).call(zoom.scaleBy, 1.8);
  (wrap.querySelector(".zout") as HTMLButtonElement).onclick = () => svg.transition().duration(400).call(zoom.scaleBy, 1 / 1.8);
  (wrap.querySelector(".zreset") as HTMLButtonElement).onclick = () => {
    getProps().onBackgroundClick();
    reset();
  };

  function layout(force = false) {
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    if (!geo || !W || !H) return;
    if (!force && W === lastW && H === lastH && proj) return;
    const resized = W !== lastW || H !== lastH;
    lastW = W;
    lastH = H;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll(".sea,.seawash").attr("width", W).attr("height", H);
    svg.select(".seawv").attr("x", -20).attr("width", W + 40).attr("height", H);
    proj = d3.geoMercator().fitExtent(
      [[70, 30], [W - 30, H - 44]],
      { type: "MultiPoint", coordinates: [[34.27, 29.49], [35.9, 33.33]] }
    );
    const path = d3.geoPath(proj);
    svg.select(".land").attr("d", path(geo.land));
    svg.select(".nb").attr("d", path(geo.neighbors));
    const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));
    const lakes = LAKES.map((l) => line(l.map((c) => proj!(c)!))).join(" ");
    svg.select(".lakes").attr("d", lakes);
    svg.select(".lakeclip").attr("d", lakes).attr("transform", T.toString());
    svg.select(".lakewv").attr("x", -20).attr("width", W + 40).attr("height", H);
    zoom.translateExtent([[-W * 0.3, -H * 0.3], [W * 1.3, H * 1.3]]).extent([[0, 0], [W, H]]);

    const deco = svg.select<SVGGElement>(".deco");
    deco.selectAll("*").remove();
    for (const boat of BOATS) {
      const pos = deco.append("g").attr("class", "sp").datum(boat) as unknown as d3.Selection<SVGGElement, unknown, null, undefined>;
      const anim = pos.append("g").attr("class", "sea-boat");
      const art = anim
        .append("g")
        .attr("transform", boat.flip ? "scale(-1,1)" : null)
        .append("g")
        .attr("class", "bob")
        .attr("filter", "url(#fs-ink)");
      art.append("path").attr("d", "M-16 0 L16 0 L10 8 L-10 8 Z").attr("fill", boat.c).attr("stroke", ink).attr("stroke-width", 1.2);
      art.append("path").attr("d", "M0 0 V-22 L13 -4 Z").attr("fill", "#faf8f3").attr("stroke", ink).attr("stroke-width", 1.2);
      art.append("rect").attr("x", -20).attr("y", -26).attr("width", 40).attr("height", 38).attr("fill", "transparent");
      anim.on("click", function (ev: MouseEvent) {
        ev.stopPropagation();
        sailBoat(this, boat.flip, pos);
      });
    }
    const compass = deco.append("g").attr("transform", `translate(${W - 46},${H - 80})`).attr("filter", "url(#fs-ink)");
    compass.append("circle").attr("r", 20).attr("fill", "rgba(250,248,240,.75)").attr("stroke", ink).attr("stroke-width", 1.2);
    compass.append("path").attr("d", "M0 -16 L5 0 L0 16 L-5 0 Z").attr("fill", "none").attr("stroke", ink).attr("stroke-width", 1.2);
    compass.append("path").attr("d", "M0 -16 L5 0 L-5 0 Z").attr("fill", "#c9552b");
    compass.append("text").attr("class", "f-amatic").attr("y", -25).attr("text-anchor", "middle").attr("font-weight", 700).attr("font-size", 19).attr("fill", ink).text("צפון");

    if (resized) svg.call(zoom.transform, d3.zoomIdentity);
    else paint();
  }

  // group nearby points so markers never overlap: whole cities collapse
  // into one tag when zoomed out, and split back into pins as you zoom in
  function clusters(): Cluster[] {
    const { points, cityLabels } = getProps();
    const pts: Unit[] = points.map((it) => {
      const [x, y] = proj!(it.ll)!;
      return { m: [it], x: T.applyX(x), y: T.applyY(y), whole: false };
    });
    const units: Unit[] = [];
    for (const [, ps] of d3.groups(pts, (p) => p.m[0].city)) {
      const x = d3.mean(ps, (p) => p.x)!;
      const y = d3.mean(ps, (p) => p.y)!;
      const spread = d3.max(ps, (p) => Math.hypot(p.x - x, p.y - y))!;
      if (ps.length === 1 || spread < 70) units.push({ m: ps.flatMap((p) => p.m), x, y, whole: ps.length > 1 });
      else ps.forEach((p) => units.push({ ...p, whole: false }));
    }
    const out: Cluster[] = [];
    units.sort((a, b) => b.m.length - a.m.length);
    for (const p of units) {
      if (p.used) continue;
      const g = [p];
      p.used = true;
      for (const q of units) {
        const reach = p.whole && q.whole ? (T.k < 2.5 ? 50 : 44) : 16;
        if (!q.used && Math.hypot(p.x - q.x, p.y - q.y) < reach) {
          g.push(q);
          q.used = true;
        }
      }
      const m = g.flatMap((u) => u.m);
      const n = m.length;
      out.push(
        describe(
          {
            m,
            whole: g.every((u) => u.whole || u.m.length === 1) && n > 1,
            x: d3.sum(g, (u) => u.x * u.m.length) / n,
            y: d3.sum(g, (u) => u.y * u.m.length) / n,
          },
          cityLabels
        )
      );
    }
    return out;
  }

  function describe(c: Pick<Cluster, "m" | "whole" | "x" | "y"> & Partial<Cluster>, cityLabels: Record<string, string>): Cluster {
    const by = d3.rollups(c.m, (v) => v.length, (i) => i.city).sort((a, b) => b[1] - a[1]);
    const main = by[0][0];
    const cities = by.map((b) => b[0]);
    const named = c.m.length > 1 && c.whole && !(T.k < 2.5 && c.m.length < 4);
    const name = (cities.length > 1 ? "סביבת " : "") + (cityLabels[main] ?? main);
    return Object.assign(c, {
      main,
      cities,
      named,
      name,
      w: c.m.length === 1 ? 18 : named ? name.length * 8.6 + 44 : 32,
      key: c.m.map((i) => i.id).sort((a, b) => a - b).join("-") + (named ? "n" : ""),
    }) as Cluster;
  }

  function paint() {
    if (!proj || disposed) return;
    const { points, cityLabels, cityCenters, selectedCity, highlightId, popupId } = getProps();
    const cl = clusters();
    const k = T.k;
    svg.selectAll<SVGGElement, (typeof BOATS)[number]>(".sp").attr("transform", (o) => {
      const p = proj!(o.ll)!;
      return `translate(${T.applyX(p[0])},${T.applyY(p[1])})`;
    });

    const offsets = (c: Cluster): [number, number][] => [[0, -24], [0, 24], [c.w / 2 + 14, 0], [-c.w / 2 - 14, 0]];
    const rectAt = (c: Cluster, o: [number, number]): Rect =>
      c.m.length > 1 ? [c.x + o[0] - c.w / 2 - 3, c.y + o[1] - 18, c.w + 6, 36] : [c.x - 11, c.y - 26, 22, 30];

    // place each tag on a free side of its anchor; if none is free, fold it into its neighbor
    for (let guard = 0; guard < 40; guard++) {
      cl.sort((p, q) => q.m.length - p.m.length);
      const placed: { c: Cluster; r: Rect; a: Rect }[] = [];
      let merged = false;
      for (const c of cl) {
        const anchor: Rect = [c.x - 4, c.y - 4, 8, 8];
        const opts: [number, number][] = c.m.length > 1 ? offsets(c) : [[0, 0]];
        const o = opts.find((o) => {
          const r = rectAt(c, o);
          return !placed.some((p) => overlaps(r, p.r) || overlaps(anchor, p.r) || overlaps(r, p.a));
        });
        if (o) {
          c.o = o;
          placed.push({ c, r: rectAt(c, o), a: anchor });
          continue;
        }
        const r0 = rectAt(c, opts[0]);
        const host = (placed.find((p) => overlaps(r0, p.r) || overlaps(anchor, p.r)) ?? placed[0]).c;
        const n = host.m.length + c.m.length;
        host.x = (host.x * host.m.length + c.x * c.m.length) / n;
        host.y = (host.y * host.m.length + c.y * c.m.length) / n;
        host.m = host.m.concat(c.m);
        host.whole = host.whole && (c.whole || c.m.length === 1);
        cl.splice(cl.indexOf(c), 1);
        describe(host, cityLabels);
        merged = true;
        break;
      }
      if (!merged) break;
    }

    svg
      .select(".marks")
      .selectAll<SVGGElement, Cluster>("g.mk")
      .data(cl, (d) => d.key + (d.o ? "@" + d.o.join(",") : ""))
      .join((enter) => {
        const g = enter.append("g").attr("class", "mk");
        g.each(function (d) {
          const inner = d3.select(this).append("g").attr("class", "in");
          if (d.m.length > 1) {
            const w = d.w;
            const top = -15;
            const [ox, oy] = d.o ?? [0, -24];
            const ex = ox === 0 ? 0 : Math.sign(ox) * 14;
            const ey = oy === 0 ? 0 : Math.sign(oy) * 9;
            inner.append("line").attr("x1", 0).attr("y1", 0).attr("x2", ex).attr("y2", ey).attr("stroke", ink).attr("stroke-width", 1.3);
            inner.append("circle").attr("r", 3).attr("fill", ink);
            inner.append("circle").attr("r", 14).attr("fill", "transparent");
            const tag = inner.append("g").attr("transform", `translate(${ox},${oy})`);
            tag.append("rect").attr("x", -w / 2 - 3).attr("y", top - 3).attr("width", w + 6).attr("height", 36).attr("fill", "transparent");
            tag.append("rect").attr("class", "body").attr("x", -w / 2).attr("y", top).attr("width", w).attr("height", 30).attr("rx", 4).attr("stroke", ink).attr("stroke-width", 1.3);
            const cx = d.named ? -w / 2 + 17 : 0;
            tag.append("text").attr("class", "num f-karantina").attr("x", cx).attr("y", top + 24).attr("text-anchor", "middle").attr("font-weight", 700).attr("font-size", 27).text(d.m.length);
            if (d.named) {
              tag.append("line").attr("class", "sep").attr("x1", -w / 2 + 34).attr("x2", -w / 2 + 34).attr("y1", top + 6).attr("y2", top + 24).attr("stroke-width", 1);
              tag.append("text").attr("class", "cn f-amatic").attr("x", w / 2 - 9).attr("y", top + 22).attr("text-anchor", "end").attr("font-weight", 700).attr("font-size", 23).text(d.name);
            }
          } else {
            const it = d.m[0];
            inner.append("circle").attr("r", 16).attr("cy", -12).attr("fill", "transparent");
            inner.append("ellipse").attr("rx", 4).attr("ry", 1.6).attr("fill", "rgba(42,42,32,.25)");
            inner
              .append("path")
              .attr("class", "body")
              .attr("d", "M0 0 C-1.5 -5 -7.5 -8.5 -7.5 -14.5 A7.5 7.5 0 1 1 7.5 -14.5 C7.5 -8.5 1.5 -5 0 0 Z")
              .attr("fill", it.color)
              .attr("stroke", ink)
              .attr("stroke-width", 1.3);
            inner.append("circle").attr("cy", -14.5).attr("r", 2.8).attr("fill", "#faf8f3").attr("stroke", ink).attr("stroke-width", 1);
            if (it.today) inner.append("circle").attr("cx", 6.5).attr("cy", -21).attr("r", 3.2).attr("fill", "#c9552b").attr("stroke", "#faf8f3").attr("stroke-width", 1.2);
          }
        });
        g.on("mouseenter", (_e, d) => {
          tip.textContent =
            d.m.length > 1 ? `${countLabel(d.m.length)} · ${d.cities.map((c) => cityLabels[c] ?? c).join(", ")}` : d.m[0].tip;
          tip.style.left = d.x + (d.o ? d.o[0] : 0) + "px";
          tip.style.top = d.y + (d.m.length > 1 ? (d.o ? d.o[1] : -24) - 16 : -24) + "px";
          tip.style.opacity = "1";
        })
          .on("mouseleave", () => {
            tip.style.opacity = "0";
          })
          .on("click", (_e, d) => {
            tip.style.opacity = "0";
            if (d.m.length > 1) zoomTo(d.m.map((i) => i.ll));
            getProps().onMarkerClick(d.main, d.m);
          });
        return g;
      })
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .each(function (d) {
        const g = d3.select(this);
        const hl = d.m.some((i) => i.id === highlightId || i.id === popupId);
        const sel = selectedCity !== null && d.cities.includes(selectedCity);
        if (d.m.length > 1) {
          g.select(".body").attr("fill", sel ? "#c9552b" : "#faf6ea").attr("stroke", hl ? "#c9552b" : ink).attr("stroke-width", hl ? 2.6 : 1.3);
          g.selectAll(".num,.cn").attr("fill", sel ? "#faf8f3" : ink);
          g.select(".sep").attr("stroke", sel ? "rgba(250,248,243,.5)" : "rgba(42,42,32,.3)");
        } else {
          g.select(".body").attr("stroke", hl ? "#c9552b" : ink).attr("stroke-width", hl ? 2.6 : 1.3);
          g.select(".in").attr("transform", hl ? "scale(1.25)" : null);
        }
      });

    // labels go wherever there's still room after the markers
    const taken: Rect[] = cl.map((c) => rectAt(c, c.o ?? [0, 0]));
    const claim = (x: number, y: number, w: number, h: number) => {
      const r: Rect = [x, y, w, h];
      if (x < 0 || x + w > W || y < 0 || y + h > H || taken.some((b) => overlaps(r, b))) return false;
      taken.push(r);
      return true;
    };
    const labels: Label[] = [];
    svg.selectAll<SVGGElement, (typeof BOATS)[number]>(".sp").style("display", (o) => {
      const p = proj!(o.ll)!;
      const x = T.applyX(p[0]);
      const y = T.applyY(p[1]);
      return cl.some((c) => overlaps([x - 22, y - 28, 44, 40], rectAt(c, c.o ?? [0, 0]))) ? "none" : null;
    });
    if (k >= 2.5) {
      const tagged = new Set(cl.filter((c) => c.named).flatMap((c) => c.cities));
      const cityGroups = d3
        .groups(points, (i) => i.city)
        .filter(([c, its]) => !tagged.has(c) && (its.length > 1 || k >= 8))
        .sort((a, b) => b[1].length - a[1].length);
      for (const [c] of cityGroups) {
        const center = cityCenters[c];
        if (!center) continue;
        const [px, py] = proj(center)!;
        const cx = T.applyX(px);
        const cy = T.applyY(py);
        const label = cityLabels[c] ?? c;
        const w = label.length * 12 + 10;
        for (const [ox, oy] of [[0, 0], [0, -46], [0, 46], [w / 2 + 40, 0], [-w / 2 - 40, 0]]) {
          if (claim(cx + ox - w / 2, cy + oy - 16, w, 32)) {
            labels.push({ k: "c" + c, x: cx + ox, y: cy + oy + 11, fs: 34, sel: c === selectedCity, t: label });
            break;
          }
        }
      }
    }
    for (const [name, ll] of NEIGHBORS) {
      const [x, y] = proj(ll)!;
      const sx = T.applyX(x);
      const sy = T.applyY(y);
      const w = name.length * 12;
      if (claim(sx - w / 2, sy - 20, w, 24)) labels.push({ k: "nb" + name, x: sx, y: sy, fs: 24, nb: true, t: name });
    }
    const [seaPx, seaPy] = proj([34.3, 32.55])!;
    const seaX = T.applyX(seaPx);
    const seaY = T.applyY(seaPy);
    if (k < 3 && claim(seaX - 60, seaY - 30, 120, 36)) {
      labels.push({ k: "sea", x: Math.max(70, seaX), y: seaY, fs: Math.max(28, Math.min(40, H / 18)), sea: true, t: "הים התיכון" });
    }
    svg
      .select(".labels")
      .selectAll<SVGTextElement, Label>("text")
      .data(labels, (d) => d.k)
      .join("text")
      .attr("class", (d) => (d.nb || d.sea ? "f-amatic" : "f-amatic halo"))
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("text-anchor", "middle")
      .attr("font-weight", 700)
      .attr("font-size", (d) => d.fs)
      .attr("fill", (d) => (d.sea ? "rgba(42,74,52,.75)" : d.nb ? "rgba(42,42,32,.4)" : d.sel ? "#c9552b" : ink))
      .attr("transform", (d) => (d.sea ? `rotate(-8 ${d.x} ${d.y})` : null))
      .text((d) => d.t);

    const open = popupId !== null ? points.find((p) => p.id === popupId) : undefined;
    if (open) {
      const [x, y] = proj(open.ll)!;
      pop.style.left = T.applyX(x) + "px";
      pop.style.top = T.applyY(y) + "px";
      pop.style.display = "flex";
    } else {
      pop.style.display = "none";
    }
  }

  fetch("/map/israel.json")
    .then((r) => r.json())
    .then((data) => {
      if (disposed) return;
      geo = data;
      layout(true);
    });
  const observer = new ResizeObserver(() => layout());
  observer.observe(wrap);

  return {
    paint,
    zoomTo,
    reset,
    destroy() {
      disposed = true;
      observer.disconnect();
      svg.on(".zoom", null).interrupt();
    },
  };
}

export default function IllustratedMap(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const apiRef = useRef<MapApi | null>(null);

  useImperativeHandle(props.handleRef, () => ({
    zoomTo: (lls, maxK) => apiRef.current?.zoomTo(lls, maxK),
    reset: () => apiRef.current?.reset(),
  }));

  // props reach the d3 side through this ref on every render
  useEffect(() => {
    propsRef.current = props;
    apiRef.current?.paint();
  });

  useEffect(() => {
    const api = mountMap(wrapRef.current!, svgRef.current!, tipRef.current!, popRef.current!, () => propsRef.current);
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapRef} className={`illustrated-map relative overflow-hidden bg-sand min-w-0 ${props.className ?? ""}`}>
      <svg ref={svgRef} className="absolute inset-0 w-full h-full block" style={{ direction: "ltr" }} />
      <div ref={tipRef} className="map-tip" />
      <div ref={popRef} className="map-pop">
        {props.popup}
      </div>
      <div className="map-zoom">
        <button type="button" className="zin" aria-label="התקרבות">+</button>
        <button type="button" className="zout" aria-label="התרחקות">−</button>
        <button type="button" className="zreset text-[15px]" aria-label="כל הארץ">⤢</button>
      </div>
    </div>
  );
}
