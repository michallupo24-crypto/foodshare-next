"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { CITIES, CITY_LABELS, CATEGORIES } from "@/lib/constants";
import CategoryPicker from "@/components/CategoryPicker";

export default function EditItemPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { userId, profile, loading } = useAuth();

  const [itemName, setItemName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState("Tel Aviv");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !userId) router.push("/login");
  }, [loading, userId, router]);

  useEffect(() => {
    supabase
      .from("food_items")
      .select("item_name,expiry_date,quantity,category,pickup_city,pickup_location,user_id")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setItemName(data.item_name);
        setOriginalName(data.item_name);
        setExpiry(data.expiry_date);
        setQuantity(String(data.quantity));
        setCategory(data.category);
        setCity(data.pickup_city);
        setLocation(data.pickup_location);
        setReady(true);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("food_items")
      .update({
        item_name: itemName.trim(),
        expiry_date: expiry,
        quantity: Number(quantity),
        category,
        pickup_city: city,
        pickup_location: location.trim(),
      })
      .eq("id", id);

    if (error) {
      setIsError(true);
      setMessage("עדכון המוצר נכשל: " + error.message);
      return;
    }
    setIsError(false);
    setMessage("המוצר עודכן בהצלחה!");
    setTimeout(() => router.push("/board"), 800);
  }

  if (!ready) return <p className="page">טוען...</p>;

  return (
    <div className="page split">
      <div className="flex flex-col gap-3.5 pt-2">
        <div className="eyebrow">
          {originalName} · {CITY_LABELS[city] ?? city}
        </div>
        <h1 className="display">עריכת מוצר</h1>
        <p className="lede m-0">הכתובת המדויקת לא מוצגת בלוח. היא נשלחת רק למי שמתאם/ת איתך איסוף בצ&apos;אט.</p>
        {profile?.is_admin && <p className="text-sm font-bold text-ink/50 m-0">(עריכה כמנהל/ת)</p>}
      </div>

      <form onSubmit={handleSubmit} className="card form-card">
        <i className="pin" />
        {message && <p className={`font-bold m-0 ${isError ? "text-rust" : "text-green"}`}>{message}</p>}
        <label className="field">
          שם המוצר
          <input required value={itemName} onChange={(e) => setItemName(e.target.value)} className="input" />
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
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="רחוב, מספר, שכונה" />
        </label>
        <button type="submit" className="btn-primary mt-2">
          <span>שמירת שינויים</span>
          <span>←</span>
        </button>
        <Link href="/board" className="self-center text-sm text-ink/60 no-underline">ביטול וחזרה ללוח</Link>
      </form>
    </div>
  );
}
