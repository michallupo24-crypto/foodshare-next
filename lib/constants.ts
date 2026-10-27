export const CITIES = ["Tel Aviv", "Jerusalem", "Haifa", "Beersheba"];

export const CITY_LABELS: Record<string, string> = {
  "Tel Aviv": "תל אביב",
  Jerusalem: "ירושלים",
  Haifa: "חיפה",
  Beersheba: "באר שבע",
};

export const CATEGORIES = ["פחמימות", "ירקות ופירות", "מוצרי חלב", "שימורים ויבשים", "ממתקים", "אחר"];

export const CATEGORY_COLORS: Record<string, string> = {
  "פחמימות": "#b0802a",
  "ירקות ופירות": "#3e6b4a",
  "מוצרי חלב": "#4a6e90",
  "שימורים ויבשים": "#7a6a55",
  "ממתקים": "#a8506e",
  "אחר": "#c9552b",
};

// slight pinned-note tilt for cards on the board, cycled by position
const TILTS = [-0.8, 0.6, -0.4, 0.9, -0.6, 0.4];
export function tilt(index: number, scale = 1) {
  return `rotate(${TILTS[index % TILTS.length] * scale}deg)`;
}
