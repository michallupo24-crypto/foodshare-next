const CITY_COORDS: Record<string, [number, number]> = {
  "Tel Aviv": [32.0853, 34.7818],
  Jerusalem: [31.7683, 35.2137],
  Haifa: [32.794, 34.9896],
  Beersheba: [31.253, 34.7915],
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function cityDistanceKm(cityA: string, cityB: string): number | null {
  const a = CITY_COORDS[cityA];
  const b = CITY_COORDS[cityB];
  if (!a || !b) return null;
  if (cityA === cityB) return 0;
  return haversine(a[0], a[1], b[0], b[1]);
}

export function partialLocation(fullLocation: string): string {
  if (!fullLocation || !fullLocation.trim()) return "(פרטים מלאים בצ'אט עם המפרסם/ת)";
  const trimmed = fullLocation.trim().replace(/\s*\d+\s*$/, "");
  return trimmed.trim() ? trimmed : "(פרטים מלאים בצ'אט עם המפרסם/ת)";
}
