"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CITY_LABELS, tilt } from "@/lib/constants";

type ReviewSummary = {
  reviewee_id: string;
  average_rating: number;
  review_count: number;
};

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function PublicProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [trustPoints, setTrustPoints] = useState<number | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("username, city, trust_points")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setUsername(data?.username ?? "");
        setCity(data?.city ?? "");
        setTrustPoints(data?.trust_points ?? null);
      });

    supabase
      .from("review_summaries")
      .select("*")
      .eq("reviewee_id", id)
      .maybeSingle()
      .then(({ data }) => setSummary(data as ReviewSummary | null));

    supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("reviewee_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, [id]);

  return (
    <div className="page page-narrow flex flex-col gap-7">
      <div className="page-head">
        <div className="eyebrow">פרופיל{city && ` · ${CITY_LABELS[city] ?? city}`}</div>
        <h1 className="display text-[72px]">{username}</h1>
        <div className="flex gap-7 flex-wrap mt-2">
          {summary ? (
            <Stat value={summary.average_rating} label={`ממוצע מתוך ${summary.review_count} ביקורות`} />
          ) : (
            <p className="lede m-0 self-end">אין עדיין ביקורות.</p>
          )}
          {trustPoints !== null && <Stat value={trustPoints} label="נקודות אמון" />}
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <div className="eyebrow text-ink/55">ביקורות שהתקבלו</div>
          {reviews.map((r, index) => (
            <div key={r.id} className="card px-[18px] py-4 flex flex-col gap-1.5" style={{ transform: tilt(index, 0.5) }}>
              <div className="flex justify-between items-center">
                <span className="text-green text-[17px] tracking-[2px]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="text-xs text-ink/45">{new Date(r.created_at).toLocaleDateString("he-IL")}</span>
              </div>
              <p className="text-[15px] text-ink/75 m-0">{r.comment || "—"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display font-bold text-[44px] leading-none text-green">{value}</span>
      <span className="text-[13px] text-ink/60">{label}</span>
    </div>
  );
}
