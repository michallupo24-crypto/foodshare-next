"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

type Conversation = {
  other_user_id: string;
  other_username: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

// "19:12" for today, "אתמול" for yesterday, short weekday within the week, else a date
function formatWhen(iso: string) {
  const d = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((startOfToday.getTime() - dayStart.getTime()) / 86400000);
  if (daysAgo <= 0) return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (daysAgo === 1) return "אתמול";
  if (daysAgo < 7) return d.toLocaleDateString("he-IL", { weekday: "short" });
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

export default function MessagesPage() {
  const { userId, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!loading && !userId) router.push("/login?returnUrl=/messages");
  }, [loading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc("list_conversations").then(({ data }) => {
      setConversations((data ?? []) as Conversation[]);
    });
  }, [userId]);

  return (
    <div className="page page-narrow flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <div className="eyebrow">תיבת דואר</div>
        <h1 className="display">הודעות</h1>
      </div>
      {conversations.length === 0 ? (
        <p className="font-bold text-lg text-ink/50 m-0">אין עדיין שיחות.</p>
      ) : (
        <div className="card overflow-hidden">
          {conversations.map((c) => (
            <Link
              key={c.other_user_id}
              href={`/chat?with=${c.other_user_id}`}
              className="flex items-center gap-3.5 px-5 py-4 dashed-bottom last:border-b-0 text-ink no-underline hover:bg-sand hover:text-ink"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="font-display font-bold text-[32px] leading-none">{c.other_username}</span>
                <span className="text-sm text-ink/65 truncate">{c.last_message}</span>
              </div>
              <span className="text-[13px] text-ink/50 whitespace-nowrap">{formatWhen(c.last_message_at)}</span>
              {c.unread_count > 0 && (
                <span className="bg-rust text-paper rounded px-2 py-0.5 text-xs font-bold">{c.unread_count}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
