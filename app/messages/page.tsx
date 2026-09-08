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
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl mb-4">הודעות</h2>
      {conversations.length === 0 ? (
        <p>אין עדיין שיחות.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((c) => (
            <Link
              key={c.other_user_id}
              href={`/chat?with=${c.other_user_id}`}
              className="bg-[var(--paper)] border border-[var(--ink-border)] rounded-2xl p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{c.other_username}</div>
                <div className="text-sm text-[var(--ink)]/70 truncate max-w-xs">{c.last_message}</div>
              </div>
              {c.unread_count > 0 && (
                <span className="bg-[var(--rust)] text-[var(--paper)] rounded-full px-2 py-1 text-xs">
                  {c.unread_count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
