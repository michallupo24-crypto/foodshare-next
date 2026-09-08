"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    <div className="max-w-md mx-auto flex flex-col gap-4">
      <div className="bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)]">
        <h2 className="text-2xl mb-2">{username}</h2>
        <p className="text-[var(--ink)]/70 mb-1">{city}</p>
        {trustPoints !== null && (
          <p className="text-sm text-[var(--green)] mb-3">{trustPoints} נקודות אמון</p>
        )}
        {summary ? (
          <p>
            ⭐ {summary.average_rating} מתוך {summary.review_count} ביקורות
          </p>
        ) : (
          <p className="text-[var(--ink)]/70">אין עדיין ביקורות.</p>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink)]/50 tracking-wide">ביקורות שהתקבלו</span>
          {reviews.map((r) => (
            <div key={r.id} className="bg-[var(--paper)] border border-[var(--ink-border)] rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--green)]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="text-xs text-[var(--ink)]/40">
                  {new Date(r.created_at).toLocaleDateString("he-IL")}
                </span>
              </div>
              {r.comment && <p className="text-sm mt-1 text-[var(--ink)]/70">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
