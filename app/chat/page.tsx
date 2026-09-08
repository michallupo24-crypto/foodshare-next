"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import PickupCoordination from "@/components/PickupCoordination";

type Message = {
  id: number;
  sender_id: string;
  receiver_id: string;
  body: string;
  message_type: string;
  created_at: string;
  item_id: number | null;
};

function ChatInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { userId, loading } = useAuth();
  const otherId = params.get("with") ?? "";
  const urlItemId = params.get("item") ?? "";
  // the URL only carries ?item= when you arrive via an item's own card - if
  // you reply from the plain conversation list (Messages.tsx has no item
  // context to link with) we fall back to the most recent item actually
  // discussed in this thread, so both sides of a conversation always see
  // the same reviewing/address-sharing/pickup-coordination context instead
  // of only whoever happened to click through from the item card
  const [itemId, setItemId] = useState(urlItemId);

  const [otherUsername, setOtherUsername] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemExpiryDate, setItemExpiryDate] = useState("");
  const [itemPickupLocation, setItemPickupLocation] = useState("");
  const [itemLat, setItemLat] = useState<number | null>(null);
  const [itemLon, setItemLon] = useState<number | null>(null);
  const [canShareAddress, setCanShareAddress] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !userId) router.push("/login?returnUrl=/chat");
  }, [loading, userId, router]);

  useEffect(() => {
    if (!otherId) {
      router.push("/messages");
    }
  }, [otherId, router]);

  const loadHistory = useCallback(async () => {
    if (!userId || !otherId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as Message[];
    setMessages(rows);
    await supabase.rpc("mark_conversation_read", { other_user: otherId });

    if (!urlItemId) {
      const lastWithItem = [...rows].reverse().find((m) => m.item_id !== null);
      if (lastWithItem) setItemId(String(lastWithItem.item_id));
    }
  }, [userId, otherId, urlItemId]);

  useEffect(() => {
    if (!userId || !otherId) return;

    supabase
      .from("profiles")
      .select("username")
      .eq("id", otherId)
      .single()
      .then(({ data }) => setOtherUsername(data?.username ?? ""));

    if (itemId) {
      supabase
        .from("food_items")
        .select("item_name,pickup_location,expiry_date,user_id")
        .eq("id", itemId)
        .single()
        .then(async ({ data: item }) => {
          if (!item) return;
          setItemName(item.item_name);
          setItemExpiryDate(item.expiry_date);
          setItemPickupLocation(item.pickup_location);
          const isOwner = item.user_id === userId;
          if (isOwner) {
            const { data: loc } = await supabase
              .rpc("owner_item_location", { target_item: Number(itemId) })
              .single();
            const l = loc as { lat: number | null; lon: number | null } | null;
            if (l) {
              setItemLat(l.lat);
              setItemLon(l.lon);
            }
            setCanShareAddress(Boolean(item.pickup_location) || Boolean(l?.lat && l?.lon));
          }
        });

      supabase
        .rpc("has_reviewed", { target_reviewee: otherId, target_item: Number(itemId) })
        .then(({ data, error: rpcError }) => {
          if (!rpcError) {
            setCanReview(true);
            setAlreadyReviewed(Boolean(data));
          }
        });
    }

    loadHistory();

    const channel = supabase
      .channel(`chat-${[userId, otherId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        (payload) => {
          const m = payload.new as Message;
          if (m.sender_id === otherId) {
            setMessages((prev) => [...prev, m]);
            supabase.rpc("mark_conversation_read", { other_user: otherId });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, otherId, itemId]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight });
  }, [messages]);

  async function sendRow(body: string, messageType: string) {
    const row: Record<string, unknown> = {
      sender_id: userId,
      receiver_id: otherId,
      body,
      message_type: messageType,
    };
    if (itemId) row.item_id = Number(itemId);
    return supabase.from("messages").insert(row);
  }

  async function handleSend() {
    const body = input.trim();
    if (!body) return;
    const { error: sendError } = await sendRow(body, "text");
    if (sendError) {
      setError("שליחת ההודעה נכשלה: " + sendError.message);
      return;
    }
    setError("");
    setMessages((prev) => [
      ...prev,
      { id: Math.random(), sender_id: userId!, receiver_id: otherId, body, message_type: "text", created_at: new Date().toISOString() },
    ]);
    setInput("");
  }

  async function handleShareAddress() {
    let body = itemPickupLocation;
    if (!body && itemLat !== null && itemLon !== null) {
      body = `https://www.openstreetmap.org/?mlat=${itemLat}&mlon=${itemLon}#map=17/${itemLat}/${itemLon}`;
    }
    if (!body) {
      setError("לא הוגדר מיקום איסוף למוצר הזה.");
      return;
    }
    const { error: sendError } = await sendRow(body, "address");
    if (sendError) {
      setError("שליחת הכתובת נכשלה: " + sendError.message);
      return;
    }
    setError("");
    setMessages((prev) => [
      ...prev,
      { id: Math.random(), sender_id: userId!, receiver_id: otherId, body, message_type: "address", created_at: new Date().toISOString() },
    ]);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    const { error: reviewError } = await supabase.from("reviews").insert({
      reviewer_id: userId,
      reviewee_id: otherId,
      item_id: Number(itemId),
      rating: Number(rating),
      comment: comment.trim(),
    });
    if (reviewError) {
      setReviewMsg("לא הצלחנו לשמור את הביקורת (אולי כבר השארתם ביקורת על המפגש הזה).");
      return;
    }
    setAlreadyReviewed(true);
    setReviewMsg("תודה! הביקורת נשלחה.");
  }

  function renderBody(m: Message) {
    if (m.message_type === "address" && /^https?:\/\//.test(m.body)) {
      return (
        <a href={m.body} target="_blank" rel="noopener noreferrer" className="underline">
          פתיחת המיקום במפה
        </a>
      );
    }
    return m.body;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl mb-1">
        שיחה עם <Link href={`/profile/${otherId}`} className="underline">{otherUsername}</Link>
      </h2>
      {itemName && <p className="text-sm text-[var(--ink)]/70 mb-3">בנוגע למוצר: {itemName}</p>}

      <div ref={historyRef} className="h-96 overflow-y-auto bg-[var(--bg)] border border-[var(--ink-border)] rounded-2xl p-4 flex flex-col gap-2">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] px-4 py-2 rounded-2xl ${mine ? "self-end bg-[var(--green)] text-[var(--paper)]" : "self-start bg-[var(--paper)] border border-[var(--ink-border)]"} ${m.message_type === "address" ? "border-2 border-[var(--rust)]" : ""}`}
            >
              {m.message_type === "address" && <div className="font-semibold">📍 כתובת לאיסוף:</div>}
              {renderBody(m)}
            </div>
          );
        })}
      </div>

      {canShareAddress && (
        <div className="mt-2 text-center">
          <button onClick={handleShareAddress} className="border rounded-full px-4 py-2 text-[var(--green)]">
            📍 שלח/י כתובת מדויקת
          </button>
          <p className="text-xs text-[var(--ink)]/60 mt-1">
            {itemPickupLocation
              ? "בלחיצה תישלח לצד השני הכתובת שכתבת בפרסום המוצר."
              : "בלחיצה יישלח לצד השני קישור למפה עם מיקום ה-GPS ששיתפת בפרסום המוצר."}
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="כתבו הודעה..."
          className="flex-1 border rounded-full px-4 py-2"
        />
        <button onClick={handleSend} className="bg-[var(--green)] text-[var(--paper)] rounded-full px-5 py-2">
          שליחה
        </button>
      </div>
      {error && <p className="text-[var(--rust)] mt-2">{error}</p>}

      {canReview && !alreadyReviewed && (
        <form onSubmit={handleSubmitReview} className="mt-6 bg-[var(--paper)] p-4 rounded-2xl border border-[var(--ink-border)]">
          <h3 className="text-xl mb-2">איך היה המפגש?</h3>
          {reviewMsg && <p className="text-[var(--green)] mb-2">{reviewMsg}</p>}
          <label className="block mb-2">
            דירוג:
            <select value={rating} onChange={(e) => setRating(e.target.value)} className="border rounded-lg px-2 py-1 mr-2">
              <option value="5">5 - מצוין</option>
              <option value="4">4 - טוב</option>
              <option value="3">3 - סביר</option>
              <option value="2">2 - לא טוב</option>
              <option value="1">1 - גרוע</option>
            </select>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="הערה (לא חובה)..."
            className="w-full border rounded-lg px-3 py-2 mb-2"
          />
          <button type="submit" className="bg-[var(--green)] text-[var(--paper)] rounded-full px-4 py-2">
            שליחת ביקורת אנונימית
          </button>
        </form>
      )}
      {alreadyReviewed && <p className="text-sm text-[var(--ink)]/70 mt-4">כבר השארתם ביקורת על המפגש הזה. תודה!</p>}

      {itemId && itemExpiryDate && (
        <PickupCoordination itemId={itemId} expiryDate={itemExpiryDate} otherId={otherId} />
      )}

      <p className="mt-4">
        <Link href="/messages" className="underline">חזרה להודעות</Link>
      </p>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p>טוען...</p>}>
      <ChatInner />
    </Suspense>
  );
}
