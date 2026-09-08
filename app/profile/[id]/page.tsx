"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ReviewSummary = {
  reviewee_id: string;
  avg_rating: number;
  review_count: number;
};

export default function PublicProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("username, city")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setUsername(data?.username ?? "");
        setCity(data?.city ?? "");
      });

    supabase
      .from("review_summaries")
      .select("*")
      .eq("reviewee_id", id)
      .maybeSingle()
      .then(({ data }) => setSummary(data as ReviewSummary | null));
  }, [id]);

  return (
    <div className="max-w-md mx-auto bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)]">
      <h2 className="text-2xl mb-2">{username}</h2>
      <p className="text-[var(--ink)]/70 mb-4">{city}</p>
      {summary ? (
        <p>
          ⭐ {summary.avg_rating?.toFixed(1)} מתוך {summary.review_count} ביקורות
        </p>
      ) : (
        <p className="text-[var(--ink)]/70">אין עדיין ביקורות.</p>
      )}
    </div>
  );
}
