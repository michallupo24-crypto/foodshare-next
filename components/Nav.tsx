"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";

export default function Nav() {
  const { userId, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // refreshed on every navigation so the badge clears after reading a chat
  useEffect(() => {
    if (!userId) return;
    supabase.rpc("unread_message_count").then(({ data }) => setUnread(Number(data ?? 0)));
  }, [userId, pathname]);

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  }

  const close = () => setMenuOpen(false);
  const isActive = (...prefixes: string[]) => prefixes.some((p) => pathname.startsWith(p));
  const linkClass = (active: boolean) => (active ? "text-green" : "text-ink");

  const links = (
    <>
      <Link href="/board" onClick={close} className={linkClass(isActive("/board"))}>לוח מזון</Link>
      <Link href="/map" onClick={close} className={linkClass(isActive("/map"))}>מפה</Link>
      {userId && (
        <Link href="/add-item" onClick={close} className={linkClass(isActive("/add-item", "/edit-item"))}>
          שתף מוצר
        </Link>
      )}
      {userId && (
        <Link
          href="/messages"
          onClick={close}
          className={`flex items-center gap-1.5 ${linkClass(isActive("/messages", "/chat"))}`}
        >
          הודעות
          {unread > 0 && !isActive("/chat") && (
            <span className="bg-rust text-paper text-[11px] font-bold rounded px-1.5 py-px">{unread}</span>
          )}
        </Link>
      )}
      {userId && profile?.is_admin && (
        <Link href="/admin" onClick={close} className={linkClass(isActive("/admin"))}>ניהול</Link>
      )}
      {userId ? (
        <>
          <Link href="/account" className="text-green" onClick={close}>
            שלום, {profile?.username ?? "..."}
          </Link>
          <button onClick={handleLogout} className="text-rust font-bold text-right cursor-pointer">
            יציאה
          </button>
        </>
      ) : (
        <>
          <Link href="/login" onClick={close} className={linkClass(isActive("/login"))}>כניסה</Link>
          <Link href="/register" onClick={close} className="text-rust">הרשמה</Link>
        </>
      )}
    </>
  );

  return (
    <header
      className="sticky top-0 z-[1000] border-b-[1.6px] border-ink"
      style={{ background: "var(--header) var(--paper-noise)" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-display font-bold text-[38px] leading-none text-ink hover:text-ink">
          FoodShare
        </Link>

        <nav className="hidden sm:flex items-center gap-[18px] text-[15px] font-bold flex-wrap [&_a]:no-underline">
          {links}
        </nav>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="תפריט"
          aria-expanded={menuOpen}
          className="sm:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 border-[1.3px] border-ink rounded bg-paper"
        >
          <span className="block w-5 h-0.5 bg-ink" />
          <span className="block w-5 h-0.5 bg-ink" />
          <span className="block w-5 h-0.5 bg-ink" />
        </button>
      </div>

      {menuOpen && (
        <nav className="sm:hidden flex flex-col items-start gap-3 px-4 pb-4 text-[15px] font-bold [&_a]:no-underline">
          {links}
        </nav>
      )}
    </header>
  );
}
