"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const CITIES = ["Tel Aviv", "Jerusalem", "Haifa", "Beersheba"];
const CITY_LABELS: Record<string, string> = {
  "Tel Aviv": "תל אביב",
  Jerusalem: "ירושלים",
  Haifa: "חיפה",
  Beersheba: "באר שבע",
};
const CATEGORIES = ["פחמימות", "ירקות ופירות", "מוצרי חלב", "שימורים ויבשים", "ממתקים", "אחר"];
const MIN_REVIEWS_FOR_PHOTO = 2;

export default function AddItemPage() {
  const { userId, loading } = useAuth();
  const router = useRouter();

  const [itemName, setItemName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState("Tel Aviv");
  const [location, setLocation] = useState("");
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState("");
  const [reviewCount, setReviewCount] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !userId) router.push("/login");
  }, [loading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewee_id", userId)
      .then(({ count }) => setReviewCount(count ?? 0));
  }, [userId]);

  function shareItemLocation() {
    if (!navigator.geolocation) {
      setGpsStatus("הדפדפן לא תומך בשיתוף מיקום.");
      return;
    }
    setGpsStatus("מבקש הרשאה...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsStatus("המיקום שותף בהצלחה. מי שיחפש יראה מרחק מדויק.");
      },
      () => setGpsStatus("שיתוף המיקום נכשל או נדחה - אפשר לפרסם גם בלעדיו.")
    );
  }

  const canUploadPhoto = reviewCount >= MIN_REVIEWS_FOR_PHOTO;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!location.trim() && !gps) {
      setIsError(true);
      setMessage("יש למלא כתובת, או לשתף מיקום GPS.");
      return;
    }

    setBusy(true);

    const item: Record<string, unknown> = {
      user_id: userId,
      item_name: itemName.trim(),
      expiry_date: expiry,
      quantity: Number(quantity),
      category,
      pickup_city: city,
      pickup_location: location.trim(),
    };
    if (gps) {
      item.lat = gps.lat;
      item.lon = gps.lon;
    }

    if (canUploadPhoto && photoFile) {
      const path = `${userId}/${crypto.randomUUID()}-${photoFile.name}`;
      const { error: uploadError } = await supabase.storage.from("item-photos").upload(path, photoFile);
      if (uploadError) {
        setIsError(true);
        setMessage("המוצר לא פורסם - העלאת התמונה נכשלה. נסו שוב בלי תמונה או עם קובץ אחר.");
        setBusy(false);
        return;
      }
      const { data: pub } = supabase.storage.from("item-photos").getPublicUrl(path);
      item.photo_url = pub.publicUrl;
    }

    const { error: insertError } = await supabase.from("food_items").insert(item);
    setBusy(false);

    if (insertError) {
      setIsError(true);
      setMessage("פרסום המוצר נכשל: " + insertError.message);
      return;
    }

    setIsError(false);
    setMessage("המוצר פורסם בהצלחה!");
    setItemName("");
    setQuantity("1");
    setLocation("");
    setGps(null);
    setGpsStatus("");
  }

  return (
    <div className="max-w-md mx-auto bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)]">
      <h2 className="text-2xl mb-4">הוספת מוצר לשיתוף</h2>
      {message && (
        <p className={isError ? "text-[var(--rust)] mb-3" : "text-[var(--green)] mb-3"}>{message}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required placeholder="שם המוצר" value={itemName} onChange={(e) => setItemName(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="number" min={1} placeholder="כמות" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border rounded-lg px-3 py-2" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded-lg px-3 py-2">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="border rounded-lg px-3 py-2">
          {CITIES.map((c) => (
            <option key={c} value={c}>{CITY_LABELS[c]}</option>
          ))}
        </select>
        <input
          placeholder="כתובת / מיקום מדויק"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required={!gps}
          className="border rounded-lg px-3 py-2"
        />
        <button type="button" onClick={shareItemLocation} className="border rounded-full px-4 py-2 text-[var(--green)]">
          שיתוף מיקום המוצר למרחק מדויק (לא חובה)
        </button>
        {gpsStatus && <p className="text-sm text-[var(--ink)]/70">{gpsStatus}</p>}
        {gps && <p className="text-sm text-[var(--green)]">שיתפת מיקום GPS - אין חובה למלא גם כתובת בטקסט.</p>}

        <div className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--ink-border)]">
          <div className="font-semibold">
            {canUploadPhoto ? "תמונות נפתחו" : "תמונות ייפתחו אחרי 2 ביקורות"}
          </div>
          <div className="text-sm text-[var(--ink)]/70">
            {canUploadPhoto
              ? "אפשר לצרף תמונה אחת למוצר. תמונה שדווחה מוסתרת עד שמנהל/ת בודק/ת אותה."
              : "אחרי שתי מסירות עם ביקורת נפתחת האפשרות לצרף תמונה למוצר."}
          </div>
          <div className="text-sm mt-1">{Math.min(reviewCount, 2)} מתוך 2 ביקורות</div>
          {canUploadPhoto && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="mt-2"
            />
          )}
        </div>

        <button disabled={busy} type="submit" className="bg-[var(--green)] text-[var(--paper)] rounded-full px-4 py-2 mt-2">
          {busy ? "מפרסם..." : "פרסם מוצר"}
        </button>
      </form>
    </div>
  );
}
