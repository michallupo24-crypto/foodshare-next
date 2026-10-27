"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { CITIES, CITY_LABELS } from "@/lib/constants";

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

  if (!profile) return <p className="page">טוען...</p>;

  return (
    <div className="page split">
      <div className="flex flex-col gap-3.5 pt-2">
        <div className="eyebrow">החשבון שלי</div>
        <h1 className="display">הפרופיל שלי</h1>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-[44px] leading-none text-green">{profile.trust_points}</span>
          <span className="lede">נקודות אמון</span>
        </div>
        <Link href={`/profile/${userId}`} className="self-start text-sm font-bold no-underline">
          איך אחרים רואים אותי ←
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card form-card">
        <i className="pin" />
        {message && <p className={`font-bold m-0 ${isError ? "text-rust" : "text-green"}`}>{message}</p>}
        <label className="field">
          שם משתמש
          <input
            required
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className="input"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            שם פרטי
            <input
              required
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              className="input"
            />
          </label>
          <label className="field">
            שם משפחה
            <input
              required
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              className="input"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            שנת לידה
            <input
              type="number"
              value={profile.birth_year ?? ""}
              onChange={(e) => setProfile({ ...profile, birth_year: e.target.value ? Number(e.target.value) : null })}
              className="input"
            />
          </label>
          <label className="field">
            עיר
            <select
              value={profile.city ?? "Tel Aviv"}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              className="input"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{CITY_LABELS[c]}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          כתובת
          <input
            placeholder="כתובת (רחוב, שכונה...) - לא חובה"
            value={profile.address ?? ""}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            className="input"
          />
        </label>
        <button disabled={busy} type="submit" className="btn-primary mt-2">
          <span>{busy ? "שומר..." : "שמירה"}</span>
          <span>←</span>
        </button>
      </form>
    </div>
  );
}
