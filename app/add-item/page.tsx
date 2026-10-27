"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import LocationPreviewMap from "@/components/LocationPreviewMap";
import CategoryPicker from "@/components/CategoryPicker";
import { CITIES, CITY_LABELS, CATEGORIES } from "@/lib/constants";

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
    <div className="page split">
      <div className="flex flex-col gap-3.5 pt-2">
        <div className="eyebrow">שתף מוצר</div>
        <h1 className="display">הוספת מוצר לשיתוף</h1>
        <p className="lede m-0">הכתובת המדויקת לא מוצגת בלוח. היא נשלחת רק למי שמתאם/ת איתך איסוף בצ&apos;אט.</p>

        <div className="card mt-3 p-4 flex flex-col gap-1.5">
          <div className="font-bold">{canUploadPhoto ? "תמונות נפתחו" : "תמונות ייפתחו אחרי 2 ביקורות"}</div>
          <div className="text-sm text-ink/70 [text-wrap:pretty]">
            {canUploadPhoto
              ? "אפשר לצרף תמונה אחת למוצר. תמונה שדווחה מוסתרת עד שמנהל/ת בודק/ת אותה."
              : "אחרי שתי מסירות עם ביקורת נפתחת האפשרות לצרף תמונה למוצר."}
          </div>
          <div className="flex gap-1 mt-1.5">
            {Array.from({ length: MIN_REVIEWS_FOR_PHOTO }, (_, i) => (
              <i key={i} className={`flex-1 h-1.5 rounded-[3px] ${i < reviewCount ? "bg-green" : "bg-ink/30"}`} />
            ))}
          </div>
          <div className="font-bold text-sm text-ink/70">
            {Math.min(reviewCount, MIN_REVIEWS_FOR_PHOTO)} מתוך {MIN_REVIEWS_FOR_PHOTO} ביקורות
          </div>
          {canUploadPhoto && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="mt-2 text-sm"
            />
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card form-card">
        <i className="pin" />
        {message && <p className={`font-bold m-0 ${isError ? "text-rust" : "text-green"}`}>{message}</p>}
        <label className="field">
          שם המוצר
          <input required placeholder="למשל: לחם מחמצת" value={itemName} onChange={(e) => setItemName(e.target.value)} className="input" />
        </label>
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
          <label className="field">
            תאריך תפוגה
            <input required type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input" />
          </label>
          <label className="field">
            כמות
            <input required type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" />
          </label>
        </div>
        <CategoryPicker value={category} onChange={setCategory} />
        <label className="field">
          עיר
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input">
            {CITIES.map((c) => (
              <option key={c} value={c}>{CITY_LABELS[c]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          כתובת / מיקום מדויק
          <input
            placeholder="רחוב, מספר, שכונה"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required={!gps}
            className="input"
          />
        </label>
        <button type="button" onClick={shareItemLocation} className="btn-outline">
          שיתוף מיקום המוצר למרחק מדויק (לא חובה)
        </button>
        {gpsStatus && <p className="text-sm text-ink/70 m-0">{gpsStatus}</p>}
        {gps && <p className="text-sm text-green m-0">שיתפת מיקום GPS - אין חובה למלא גם כתובת בטקסט.</p>}
        {gps && <LocationPreviewMap lat={gps.lat} lon={gps.lon} />}

        <button disabled={busy} type="submit" className="btn-primary mt-2">
          <span>{busy ? "מפרסם..." : "פרסם מוצר"}</span>
          <span>←</span>
        </button>
      </form>
    </div>
  );
}
