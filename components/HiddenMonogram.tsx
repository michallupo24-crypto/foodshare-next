import fs from "fs";
import path from "path";

// hidden in plain sight: the monogram is actually rendered (not
// display:none), but its fill is set to the page background color, so it's
// invisible under normal use - change the background and it appears.
export default function HiddenMonogram() {
  const svg = fs.readFileSync(path.join(process.cwd(), "public", "monogram.svg"), "utf-8");

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        width: 64,
        height: 64,
        color: "var(--bg)",
        pointerEvents: "none",
        zIndex: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
