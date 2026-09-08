"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditItemPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { userId, profile, loading } = useAuth();

  const [itemName, setItemName] = useState("");
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

  if (!ready) return <p>טוען...</p>;

  return (
    <div className="max-w-md mx-auto bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)]">
      <h2 className="text-2xl mb-4">עריכת מוצר</h2>
      {message && (
        <p className={isError ? "text-[var(--rust)] mb-3" : "text-[var(--green)] mb-3"}>{message}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required value={itemName} onChange={(e) => setItemName(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border rounded-lg px-3 py-2" />
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
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="כתובת / מיקום" />
        <button type="submit" className="bg-[var(--green)] text-[var(--paper)] rounded-full px-4 py-2 mt-2">
          שמירה
        </button>
      </form>
      {profile?.is_admin && <p className="text-xs text-[var(--ink)]/50 mt-2">(עריכה כמנהל/ת)</p>}
    </div>
  );
}
