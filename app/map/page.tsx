"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { CITY_COORDS, partialLocation } from "@/lib/geo";
import { CATEGORIES, CATEGORY_COLORS, CITIES, CITY_LABELS } from "@/lib/constants";
import IllustratedMap, { MapHandle, MapPoint } from "@/components/IllustratedMap";

type ItemRow = {
  id: number;
  user_id: string;
  item_name: string;
  category: string;
  pickup_city: string;
  pickup_location: string;
  expiry_date: string;
};

type Item = ItemRow & { daysLeft: number; place: string; ll: [number, number] };

// d3 wants [lon, lat]; lib/geo keeps [lat, lon]
const CITY_CENTERS = Object.fromEntries(
  Object.entries(CITY_COORDS).map(([city, [lat, lon]]) => [city, [lon, lat] as [number, number]])
);

// exact item coordinates are never readable (see supabase/008), so a pin is
// placed at its city's center plus a stable per-item offset (~0.5-3 km) -
// enough to spread pins apart without pretending to be the real address.
// The offset leans east so pins in coastal cities don't land in the sea.
function unitHash(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function scatter(id: number, [lon, lat]: [number, number]): [number, number] {
  const angle = (unitHash(id) * 200 - 100) * (Math.PI / 180);
  const r = 0.006 + unitHash(id * 31 + 17) * 0.022;
  return [lon + Math.cos(angle) * r, lat + Math.sin(angle) * r * 0.85];
}

const expiryText = (d: number) => (d <= 0 ? "עד היום" : d === 1 ? "עד מחר" : `עוד ${d} ימים`);

export default function MapPage() {
  const { userId } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [popupId, setPopupId] = useState<number | null>(null);
  const mapRef = useRef<MapHandle | null>(null);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("food_items")
      .select("id,user_id,item_name,category,pickup_city,pickup_location,expiry_date")
      .gte("expiry_date", today.toISOString().slice(0, 10))
      .order("expiry_date", { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as ItemRow[];
        setItems(
          rows
            .filter((r) => CITY_CENTERS[r.pickup_city])
            .map((r) => ({
              ...r,
              daysLeft: Math.ceil((new Date(r.expiry_date).getTime() - today.getTime()) / 86400000),
              place: partialLocation(r.pickup_location),
              ll: scatter(r.id, CITY_CENTERS[r.pickup_city]),
            }))
        );
      });
  }, []);

  const visible = useMemo(() => items.filter((i) => !filter || i.category === filter), [items, filter]);
  const byCity = (city: string) => visible.filter((i) => i.pickup_city === city);
  const cityOrder = [...CITIES].sort((a, b) => byCity(b).length - byCity(a).length);
  const activeCities = new Set(visible.map((i) => i.pickup_city)).size;
  const soon = visible.filter((i) => i.daysLeft <= 1).length;

  const points: MapPoint[] = useMemo(
    () =>
      visible.map((i) => ({
        id: i.id,
        city: i.pickup_city,
        ll: i.ll,
        color: CATEGORY_COLORS[i.category] ?? "#c9552b",
        today: i.daysLeft <= 0,
        tip: `${i.item_name} · ${i.place} · ${expiryText(i.daysLeft)}`,
      })),
    [visible]
  );

  const popupItem = popupId !== null ? visible.find((i) => i.id === popupId) : undefined;

  function toggleCity(city: string) {
    setPopupId(null);
    if (selectedCity === city) {
      setSelectedCity(null);
      mapRef.current?.reset();
      return;
    }
    setSelectedCity(city);
    const its = byCity(city);
    mapRef.current?.zoomTo(its.length ? its.map((i) => i.ll) : [CITY_CENTERS[city]], 22);
  }

  function openItem(item: Item) {
    setSelectedCity(item.pickup_city);
    setPopupId(item.id);
    mapRef.current?.zoomTo([item.ll], 26);
  }

  return (
    <div className="flex flex-col-reverse md:flex-row h-[calc(100dvh-64px)] min-h-[620px]">
      <aside
        className="flex flex-col min-h-0 flex-[1_1_55%] md:flex-none md:w-[360px] md:border-l-[1.6px] md:border-ink"
        style={{ background: "var(--header) var(--paper-noise)" }}
      >
        <div className="px-7 pt-[26px] pb-5 flex flex-col gap-3.5 border-b-[1.6px] border-ink">
          <div className="flex justify-between items-baseline gap-3">
            <div className="eyebrow tracking-[.08em]">מפת זמינות</div>
            <Link href="/board" className="text-sm font-bold no-underline">לתצוגת לוח ←</Link>
          </div>
          <h1 className="display text-[52px] md:text-[64px]">
            {visible.length ? (
              <>
                <span className="text-rust">{visible.length}</span> מוצרים מחכים לאיסוף
              </>
            ) : (
              "אין כרגע מוצרים"
            )}
          </h1>
          <p className="m-0 font-semibold text-base leading-[1.4] text-ink/70">
            {visible.length ? `ב־${activeCities} ערים · ${soon} מהם עד מחר` : "נסו קטגוריה אחרת"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="chip font-bold" aria-pressed={!filter} onClick={() => setFilter("")}>
              הכל
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className="chip font-bold" aria-pressed={filter === c} onClick={() => setFilter(c)}>
                <i className="dot w-2.5 h-2.5 border-[1.2px] border-current" style={{ background: CATEGORY_COLORS[c] }} />
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          {cityOrder.map((city) => {
            const its = byCity(city);
            const open = city === selectedCity;
            const zero = its.length === 0;
            return (
              <div
                key={city}
                className={open ? "bg-sand/70 border-b-[1.6px] border-ink" : "dashed-bottom"}
              >
                <button
                  type="button"
                  onClick={() => toggleCity(city)}
                  aria-expanded={open}
                  className="group w-full flex items-center gap-3.5 px-7 py-3 text-right cursor-pointer"
                >
                  <span
                    className={`flex-1 font-display font-bold text-[40px] leading-none ${zero ? "text-ink/30" : open ? "text-rust" : "group-hover:text-rust"}`}
                  >
                    {CITY_LABELS[city]}
                  </span>
                  <span
                    className={`font-display font-bold text-[27px] leading-none min-w-[34px] h-[30px] px-1.5 flex items-center justify-center rounded border-[1.3px] ${
                      zero ? "text-ink/30 border-ink/25" : open ? "bg-rust text-paper border-ink" : "bg-paper border-ink"
                    }`}
                  >
                    {its.length}
                  </span>
                </button>
                {open && (
                  <div className="px-7 pb-[22px] flex flex-col">
                    {its.length ? (
                      its.map((i) => {
                        const active = highlightId === i.id || popupId === i.id;
                        return (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => openItem(i)}
                            onMouseEnter={() => setHighlightId(i.id)}
                            onMouseLeave={() => setHighlightId(null)}
                            className={`group flex items-center gap-3 py-[11px] dashed-top text-right cursor-pointer ${
                              active ? "bg-paper -mx-2.5 px-2.5 rounded outline-[1.6px] outline-solid outline-rust -outline-offset-1" : ""
                            }`}
                          >
                            <i className="dot w-[13px] h-[13px] border-[1.3px] border-ink" style={{ background: CATEGORY_COLORS[i.category] }} />
                            <span className="flex-1 min-w-0">
                              <b className="block text-base group-hover:text-green">{i.item_name}</b>
                              <span className="text-[13px] text-ink/70">{i.place}</span>
                            </span>
                            <span className={`text-[13px] font-bold whitespace-nowrap ${i.daysLeft <= 1 ? "text-rust" : "text-ink/70"}`}>
                              {expiryText(i.daysLeft)}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="m-0 font-semibold text-[15px] text-ink/65 pt-1 pb-2">אין כרגע מוצרים בקטגוריה הזו.</p>
                    )}
                    <Link
                      href={`/board?city=${encodeURIComponent(city)}`}
                      className="btn-primary mt-3.5 py-[11px] no-underline hover:bg-rust hover:text-paper"
                    >
                      <span>ללוח של {CITY_LABELS[city]}</span>
                      <span>←</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <IllustratedMap
        handleRef={mapRef}
        className="flex-[1_1_45%] min-h-[300px] md:flex-1"
        points={points}
        cityLabels={CITY_LABELS}
        cityCenters={CITY_CENTERS}
        selectedCity={selectedCity}
        highlightId={highlightId}
        popupId={popupId}
        onMarkerClick={(city, pts) => {
          setSelectedCity(city);
          setPopupId(pts.length === 1 ? pts[0].id : null);
        }}
        onBackgroundClick={() => setPopupId(null)}
        popup={
          popupItem && (
            <>
              <button
                type="button"
                onClick={() => setPopupId(null)}
                aria-label="סגירה"
                className="absolute top-2 left-2.5 text-lg leading-none text-ink/50 cursor-pointer"
              >
                ×
              </button>
              <div className="f-amatic font-bold text-[19px] leading-none flex items-center gap-1.5 text-ink/60">
                <i className="dot w-2.5 h-2.5 border-[1.2px] border-ink" style={{ background: CATEGORY_COLORS[popupItem.category] }} />
                {popupItem.category}
              </div>
              <b className="text-[19px] leading-[1.15]">{popupItem.item_name}</b>
              <div className="text-[13px] text-ink/65">
                {popupItem.place} · {CITY_LABELS[popupItem.pickup_city]}
              </div>
              <div className={`text-[13px] font-bold ${popupItem.daysLeft <= 1 ? "text-rust" : "text-ink/65"}`}>
                {expiryText(popupItem.daysLeft)}
              </div>
              <Link
                href={
                  !userId
                    ? "/login"
                    : popupItem.user_id === userId
                      ? `/edit-item/${popupItem.id}`
                      : `/chat?with=${popupItem.user_id}&item=${popupItem.id}`
                }
                className="f-amatic mt-1.5 px-3 py-[9px] bg-ink text-paper rounded font-bold text-[22px] leading-none text-center no-underline hover:bg-rust hover:text-paper"
              >
                {!userId ? "התחברו כדי לתאם איסוף" : popupItem.user_id === userId ? "עריכת המוצר" : "בקשו לאסוף"}
              </Link>
            </>
          )
        }
      />
    </div>
  );
}
