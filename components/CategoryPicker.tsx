import { CATEGORIES, CATEGORY_COLORS } from "@/lib/constants";

export default function CategoryPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="field gap-2" role="group" aria-label="קטגוריה">
      קטגוריה
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={value === c} onClick={() => onChange(c)}>
            <i className="dot" style={{ background: CATEGORY_COLORS[c] }} />
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
