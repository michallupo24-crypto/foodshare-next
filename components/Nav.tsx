"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Nav() {
  const { userId, profile } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-10 bg-[var(--paper)]/90 backdrop-blur border-b border-[var(--ink-border)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="text-2xl font-bold" style={{ fontFamily: "var(--font-frank-ruhl)" }}>
          FoodShare
        </Link>
        <nav className="flex items-center gap-4 text-sm flex-wrap">
          <Link href="/board">לוח מזון</Link>
          <Link href="/map">מפה</Link>
          {userId && <Link href="/add-item">שתף מוצר</Link>}
          {userId && <Link href="/messages">הודעות</Link>}
          {userId && profile?.is_admin && <Link href="/admin">מודרציה</Link>}
          {userId ? (
            <>
              <span className="text-[var(--green)]">
                שלום, {profile?.username ?? "..."}
              </span>
              <button onClick={handleLogout} className="text-[var(--rust)]">
                יציאה
              </button>
            </>
          ) : (
            <>
              <Link href="/login">כניסה</Link>
              <Link href="/register">הרשמה</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
