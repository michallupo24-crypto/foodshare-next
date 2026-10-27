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
    <div className="page split items-center pt-12">
      <div className="flex flex-col gap-3.5">
        <div className="eyebrow">כניסה למערכת</div>
        <h1 className="display text-[80px]">
          ברוכים <span className="text-rust">השבים</span>
        </h1>
        <p className="lede m-0">מזון שנשאר אצלכם, מישהו בשכונה ישמח לקבל.</p>
      </div>

      <form onSubmit={handleSubmit} className="card form-card max-w-[440px] w-full justify-self-center">
        <i className="pin" />
        {error && <p className="text-rust font-bold m-0">{error}</p>}
        <label className="field">
          אימייל
          <input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="input text-right" />
        </label>
        <label className="field">
          סיסמה
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </label>
        <button disabled={busy} type="submit" className="btn-primary mt-2">
          <span>{busy ? "נכנס/ת..." : "כניסה"}</span>
          <span>←</span>
        </button>
        <Link href="/register" className="self-center text-sm font-bold no-underline">
          עדיין לא רשומים? לחצו כאן להרשמה
        </Link>
      </form>
    </div>
  );
}
