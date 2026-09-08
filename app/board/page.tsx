"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { cityDistanceKm, partialLocation } from "@/lib/geo";

const CITIES = ["Tel Aviv", "Jerusalem", "Haifa", "Beersheba"];
const CITY_LABELS: Record<string, string> = {
  "Tel Aviv": "תל אביב",
  Jerusalem: "ירושלים",
  Haifa: "חיפה",
  Beersheba: "באר שבע",
};
const CATEGORIES = ["פחמימות", "ירקות ופירות", "מוצרי חלב", "שימורים ויבשים", "ממתקים", "אחר"];

type ItemRow = {
  id: number;
  user_id: string;
  item_name: string;
  category: string;
  pickup_city: string;
  pickup_location: string;
  expiry_date: string;
  quantity: number;
  photo_url: string | null;
  photo_disabled: boolean;
  profiles: { username: string } | null;
};

function BoardInner() {
  const searchParams = useSearchParams();
  const { userId, profile } = useAuth();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [distances, setDistances] = useState<Record<number, string>>({});
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") ?? "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");

  async function handleDelete(id: number) {
    if (!confirm("למחוק את המוצר?")) return;
    await supabase.from("food_items").delete().eq("id", id);
    setMessage("המוצר נמחק.");
    load();
  }

  async function handleReport(id: number) {
    if (!confirm("לדווח על התמונה כלא הולמת/מזויפת?")) return;
    const { error } = await supabase.from("photo_reports").insert({
      item_id: id,
      reporter_id: userId,
      reason: "דיווח מלוח המודעות",
    });
    setMessage(
      error ? "לא ניתן לדווח על התמונה הזו (אולי כבר דיווחתם עליה)." : "התמונה דווחה והוסתרה לבדיקה."
    );
    load();
  }

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    let query = supabase
      .from("food_items")
      .select(
        "id,user_id,item_name,category,pickup_city,pickup_location,expiry_date,quantity,photo_url,photo_disabled,profiles(username)"
      )
      .gte("expiry_date", today)
      .order("expiry_date", { ascending: true });

    if (cityFilter) query = query.eq("pickup_city", cityFilter);
    if (categoryFilter) query = query.eq("category", categoryFilter);

    const { data } = await query;
    const rows = (data ?? []) as unknown as ItemRow[];
    setItems(rows);
    setLoading(false);

    const distMap: Record<number, string> = {};
    for (const row of rows) {
      let text = "מרחק לא ידוע";
      let real: number | null = null;
      if (userId) {
        const { data: rpcData } = await supabase.rpc("item_distance_km", { target_item: row.id });
        real = typeof rpcData === "number" ? rpcData : null;
      }
      if (real !== null) {
        text = Math.round(real * 10) / 10 + ' ק"מ (מדויק)';
      } else {
        const cd = profile ? cityDistanceKm(profile.city, row.pickup_city) : null;
        text = cd !== null ? Math.round(cd) + ' ק"מ' : "מרחק לא ידוע";
      }
      distMap[row.id] = text;
    }
    setDistances(distMap);
  }, [cityFilter, categoryFilter, userId, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 className="text-3xl mb-2">זמין עכשיו</h2>
      <p className="text-sm text-[var(--ink)]/70 mb-4">
        מטעמי פרטיות מוצגת כאן רק כתובת חלקית ומרחק משוער. הכתובת המדויקת נמסרת ע&quot;י המפרסם/ת דרך הצ&apos;אט.
      </p>

      <div className="flex gap-3 flex-wrap mb-6 bg-[var(--paper)] p-4 rounded-2xl border border-[var(--ink-border)]">
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">כל הערים</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{CITY_LABELS[c]}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">כל הקטגוריות</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {message && <p className="text-sm text-[var(--green)] mb-3">{message}</p>}

      {loading ? (
        <p>טוען...</p>
      ) : items.length === 0 ? (
        <p>לא נמצאו מוצרים.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => {
            const daysLeft = Math.ceil(
              (new Date(item.expiry_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
            );
            return (
              <div key={item.id} className="bg-[var(--paper)] rounded-2xl border border-[var(--ink-border)] overflow-hidden flex flex-col">
                <div className="h-32 bg-black/5 flex items-center justify-center text-sm text-[var(--ink)]/50">
                  {item.photo_url && !item.photo_disabled ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    "אין תמונה למוצר זה"
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold">{item.item_name}</span>
                    <span className={`text-xs rounded-full px-2 py-1 ${daysLeft <= 1 ? "bg-[var(--rust)] text-[var(--paper)]" : "bg-[var(--green-chip)] text-[var(--green)]"}`}>
                      {daysLeft <= 0 ? "היום" : daysLeft === 1 ? "מחר" : `נותרו ${daysLeft} ימים`}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--ink)]/70">
                    {item.quantity} · {item.pickup_city} · {partialLocation(item.pickup_location)} · {distances[item.id] ?? "..."}
                  </div>
                  <div className="mt-auto flex justify-between items-center pt-2 flex-wrap gap-1">
                    <Link href={`/profile/${item.user_id}`} className="text-sm">
                      {item.profiles?.username}
                    </Link>
                    <div className="flex gap-2 text-sm">
                      {userId && userId !== item.user_id && (
                        <Link href={`/chat?with=${item.user_id}&item=${item.id}`} className="text-[var(--green)]">
                          הודעה
                        </Link>
                      )}
                      {userId && (userId === item.user_id || profile?.is_admin) && (
                        <>
                          <Link href={`/edit-item/${item.id}`}>עריכה</Link>
                          <button onClick={() => handleDelete(item.id)} className="text-[var(--rust)]">מחיקה</button>
                        </>
                      )}
                      {userId && userId !== item.user_id && item.photo_url && (
                        <button onClick={() => handleReport(item.id)} className="text-[var(--rust)]">דווח על תמונה</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<p>טוען...</p>}>
      <BoardInner />
    </Suspense>
  );
}
