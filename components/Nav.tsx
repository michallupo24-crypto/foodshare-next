"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Nav() {
  const { userId, profile } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  }

  const links = (
    <>
      <Link href="/board" onClick={() => setMenuOpen(false)}>לוח מזון</Link>
      <Link href="/map" onClick={() => setMenuOpen(false)}>מפה</Link>
      {userId && <Link href="/add-item" onClick={() => setMenuOpen(false)}>שתף מוצר</Link>}
      {userId && <Link href="/messages" onClick={() => setMenuOpen(false)}>הודעות</Link>}
      {userId && profile?.is_admin && <Link href="/admin" onClick={() => setMenuOpen(false)}>מודרציה</Link>}
      {userId ? (
        <>
          <span className="text-[var(--green)]">שלום, {profile?.username ?? "..."}</span>
          <button onClick={handleLogout} className="text-[var(--rust)] text-right">
            יציאה
          </button>
        </>
      ) : (
        <>
          <Link href="/login" onClick={() => setMenuOpen(false)}>כניסה</Link>
          <Link href="/register" onClick={() => setMenuOpen(false)}>הרשמה</Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-10 bg-[var(--paper)]/90 backdrop-blur border-b border-[var(--ink-border)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-bold" style={{ fontFamily: "var(--font-frank-ruhl)" }}>
          FoodShare
        </Link>

        <nav className="hidden sm:flex items-center gap-4 text-sm flex-wrap">{links}</nav>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="תפריט"
          className="sm:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 border border-[var(--ink-border)] rounded-lg"
        >
          <span className="block w-5 h-0.5 bg-[var(--ink)]" />
          <span className="block w-5 h-0.5 bg-[var(--ink)]" />
          <span className="block w-5 h-0.5 bg-[var(--ink)]" />
        </button>
      </div>

      {menuOpen && (
        <nav className="sm:hidden flex flex-col items-end gap-3 px-4 pb-4 text-sm">{links}</nav>
      )}
    </header>
  );
}
