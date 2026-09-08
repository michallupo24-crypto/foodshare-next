"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError("ההתחברות נכשלה: " + (signInError?.message ?? "שגיאה לא ידועה"));
      setBusy(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_blocked, login_count")
      .eq("id", data.user.id)
      .single();

    if (profile?.is_blocked) {
      await supabase.auth.signOut();
      setError("החשבון שלך נחסם. פנה/י למנהל/ת האתר.");
      setBusy(false);
      return;
    }

    await supabase.rpc("increment_login_count");

    setBusy(false);
    router.push("/board");
  }

  return (
    <div className="max-w-md mx-auto bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)]">
      <h2 className="text-2xl mb-4">כניסה למערכת</h2>
      {error && <p className="text-[var(--rust)] mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="password" placeholder="סיסמה" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded-lg px-3 py-2" />
        <button disabled={busy} type="submit" className="bg-[var(--green)] text-[var(--paper)] rounded-full px-4 py-2 mt-2">
          {busy ? "נכנס/ת..." : "כניסה"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/register" className="text-[var(--green)]">עדיין לא רשומים? לחצו כאן להרשמה</Link>
      </p>
    </div>
  );
}
