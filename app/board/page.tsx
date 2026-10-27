"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { cityDistanceKm, partialLocation } from "@/lib/geo";
import { CITIES, CITY_LABELS, CATEGORIES, CATEGORY_COLORS, tilt } from "@/lib/constants";

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
      let text = userId ? "מרחק לא ידוע" : "מרחק - תלוי בהרשמה";
      let real: number | null = null;
      if (userId) {
        const { data: rpcData } = await supabase.rpc("item_distance_km", { target_item: row.id });
        real = typeof rpcData === "number" ? rpcData : null;
      }
      if (real !== null) {
        text = Math.round(real * 10) / 10 + ' ק"מ (מדויק)';
      } else if (profile) {
        const cd = cityDistanceKm(profile.city, row.pickup_city);
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
    <div className="page flex flex-col gap-7">
      <div className="page-head gap-3.5">
        <div className="flex justify-between items-baseline gap-3 flex-wrap">
          <div className="eyebrow">זמין עכשיו</div>
          <Link href="/map" className="text-sm font-bold no-underline">לתצוגת מפה ←</Link>
        </div>
        <h1 className="display">
          {loading ? (
            "טוען מוצרים..."
          ) : (
            <>
              <span className="text-rust">{items.length}</span> מוצרים מחכים לאיסוף
            </>
          )}
        </h1>
        <p className="lede max-w-[640px] m-0">
          מטעמי פרטיות מוצגת כאן רק כתובת חלקית ומרחק משוער. הכתובת המדויקת נמסרת ע&quot;י המפרסם/ת דרך הצ&apos;אט.
        </p>
        {!userId && (
          <p className="lede m-0">
            <Link href="/register" className="font-bold underline">הירשמו</Link> כדי לראות מרחק עד המוצרים.
          </p>
        )}

        <div className="flex flex-col gap-2 mt-1.5">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="chip" aria-pressed={!cityFilter} onClick={() => setCityFilter("")}>
              כל הערים
            </button>
            {CITIES.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={cityFilter === c} onClick={() => setCityFilter(c)}>
                {CITY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="chip" aria-pressed={!categoryFilter} onClick={() => setCategoryFilter("")}>
              כל הקטגוריות
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              >
                <i className="dot" style={{ background: CATEGORY_COLORS[c] }} />
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-green font-semibold m-0">{message}</p>}

      {!loading && items.length === 0 ? (
        <p className="font-bold text-lg text-ink/50 py-6 m-0">לא נמצאו מוצרים.</p>
      ) : (
        <div className="grid gap-x-[22px] gap-y-7 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {items.map((item, index) => {
            const daysLeft = Math.ceil(
              (new Date(item.expiry_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
            );
            const urgent = daysLeft <= 1;
            return (
              <div
                key={item.id}
                className="card tilted pt-[26px] px-3.5 pb-3.5 flex flex-col gap-3"
                style={{ transform: tilt(index) }}
              >
                <i className="pin top-2.5 right-1/2 -mr-1" />
                <div className="h-[120px] bg-sand border border-ink/25 rounded-sm flex items-center justify-center font-bold text-sm text-ink/50 overflow-hidden">
                  {item.photo_url && !item.photo_disabled ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    "אין תמונה למוצר זה"
                  )}
                </div>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-display font-bold text-[32px] leading-none">{item.item_name}</span>
                    <span className="flex items-center gap-1.5 text-[13px] text-ink/60">
                      <i className="dot border border-ink" style={{ background: CATEGORY_COLORS[item.category] ?? "transparent" }} />
                      {item.category}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold rounded px-2.5 py-1 whitespace-nowrap ${urgent ? "bg-rust text-paper" : "bg-[var(--green-chip)] text-green"}`}
                  >
                    {daysLeft <= 0 ? "היום" : daysLeft === 1 ? "מחר" : `נותרו ${daysLeft} ימים`}
                  </span>
                </div>
                <div className="text-sm text-ink/70">
                  {item.quantity} · {CITY_LABELS[item.pickup_city] ?? item.pickup_city} · {partialLocation(item.pickup_location)} · {distances[item.id] ?? "..."}
                </div>
                <div className="mt-auto dashed-top pt-2.5 flex justify-between items-center flex-wrap gap-2 text-sm">
                  <Link href={`/profile/${item.user_id}`} className="font-bold text-ink no-underline">
                    {item.profiles?.username}
                  </Link>
                  <div className="flex gap-3 flex-wrap">
                    {userId && userId !== item.user_id && (
                      <Link href={`/chat?with=${item.user_id}&item=${item.id}`} className="font-bold no-underline">
                        הודעה ←
                      </Link>
                    )}
                    {userId && (userId === item.user_id || profile?.is_admin) && (
                      <>
                        <Link href={`/edit-item/${item.id}`} className="font-semibold text-ink no-underline">עריכה</Link>
                        <button onClick={() => handleDelete(item.id)} className="text-rust font-semibold cursor-pointer">מחיקה</button>
                      </>
                    )}
                    {userId && userId !== item.user_id && item.photo_url && (
                      <button onClick={() => handleReport(item.id)} className="text-rust font-semibold cursor-pointer">דווח על תמונה</button>
                    )}
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
    <Suspense fallback={<p className="page">טוען...</p>}>
      <BoardInner />
    </Suspense>
  );
}
