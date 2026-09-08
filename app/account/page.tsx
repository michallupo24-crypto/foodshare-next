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

type MyProfile = {
  username: string;
  first_name: string;
  last_name: string;
  phone_prefix: string | null;
  phone_number: string | null;
  birth_year: number | null;
  gender: string | null;
  city: string | null;
  address: string | null;
  trust_points: number;
};

export default function AccountPage() {
  const { userId, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !userId) router.push("/login?returnUrl=/account");
  }, [loading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc("my_profile").single().then(({ data }) => {
      if (data) setProfile(data as MyProfile);
    });
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone_prefix: profile.phone_prefix,
        phone_number: profile.phone_number,
        birth_year: profile.birth_year,
        gender: profile.gender,
        city: profile.city,
        address: profile.address,
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      setIsError(true);
      setMessage("שמירה נכשלה: " + error.message);
      return;
    }
    setIsError(false);
    setMessage("הפרטים נשמרו בהצלחה!");
  }

  if (!profile) return <p>טוען...</p>;

  return (
    <div className="max-w-md mx-auto bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)]">
      <h2 className="text-2xl mb-1">הפרופיל שלי</h2>
      <p className="text-sm text-[var(--ink)]/70 mb-4">{profile.trust_points} נקודות אמון</p>
      {message && (
        <p className={isError ? "text-[var(--rust)] mb-3" : "text-[var(--green)] mb-3"}>{message}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="שם משתמש"
          value={profile.username}
          onChange={(e) => setProfile({ ...profile, username: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          required
          placeholder="שם פרטי"
          value={profile.first_name}
          onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          required
          placeholder="שם משפחה"
          value={profile.last_name}
          onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="number"
          placeholder="שנת לידה"
          value={profile.birth_year ?? ""}
          onChange={(e) => setProfile({ ...profile, birth_year: e.target.value ? Number(e.target.value) : null })}
          className="border rounded-lg px-3 py-2"
        />
        <select
          value={profile.city ?? "Tel Aviv"}
          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          className="border rounded-lg px-3 py-2"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>{CITY_LABELS[c]}</option>
          ))}
        </select>
        <input
          placeholder="כתובת (רחוב, שכונה...) - לא חובה"
          value={profile.address ?? ""}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <button disabled={busy} type="submit" className="bg-[var(--green)] text-[var(--paper)] rounded-full px-4 py-2 mt-2">
          {busy ? "שומר..." : "שמירה"}
        </button>
      </form>
    </div>
  );
}
