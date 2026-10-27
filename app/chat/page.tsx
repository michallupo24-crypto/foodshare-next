"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import PickupCoordination from "@/components/PickupCoordination";

const RATINGS = [
  ["5", "מצוין"],
  ["4", "טוב"],
  ["3", "סביר"],
  ["2", "לא טוב"],
  ["1", "גרוע"],
];

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
      { id: Math.random(), sender_id: userId!, receiver_id: otherId, body, message_type: "text", created_at: new Date().toISOString(), item_id: itemId ? Number(itemId) : null },
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
      { id: Math.random(), sender_id: userId!, receiver_id: otherId, body, message_type: "address", created_at: new Date().toISOString(), item_id: itemId ? Number(itemId) : null },
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
    <div className="page pt-7 grid gap-7 items-start [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
      <div className="flex flex-col gap-3.5 min-w-0">
        <Link href="/messages" className="self-start text-sm font-bold no-underline">→ חזרה להודעות</Link>
        <div className="flex flex-col gap-1">
          <h1 className="display text-[56px]">
            שיחה עם{" "}
            <Link
              href={`/profile/${otherId}`}
              className="text-ink underline decoration-2 underline-offset-[6px]"
            >
              {otherUsername}
            </Link>
          </h1>
          {itemName && (
            <p className="lede m-0">
              בנוגע למוצר: <b className="text-ink">{itemName}</b>
            </p>
          )}
        </div>

        <div ref={historyRef} className="h-[400px] overflow-y-auto bg-sand border-[1.3px] border-ink rounded p-4 flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.sender_id === userId;
            const isAddress = m.message_type === "address";
            return (
              <div
                key={m.id}
                className={`max-w-[78%] px-3.5 py-2 rounded-[14px] text-[15px] [overflow-wrap:anywhere] ${mine ? "self-end bg-green text-paper" : "self-start bg-paper"} ${isAddress ? "border-2 border-rust" : mine ? "border border-green" : "border border-ink/35"} ${mine ? "[&_a]:text-paper" : ""}`}
              >
                {isAddress && <div className={`text-xs font-bold ${mine ? "text-paper" : "text-rust"}`}>כתובת לאיסוף:</div>}
                {renderBody(m)}
              </div>
            );
          })}
        </div>

        {canShareAddress && (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleShareAddress}
              className="border border-rust rounded px-4 py-2 text-sm font-bold text-rust bg-paper cursor-pointer"
            >
              שלח/י כתובת מדויקת
            </button>
            <p className="text-xs text-ink/60 m-0 text-center">
              {itemPickupLocation
                ? "בלחיצה תישלח לצד השני הכתובת שכתבת בפרסום המוצר."
                : "בלחיצה יישלח לצד השני קישור למפה עם מיקום ה-GPS ששיתפת בפרסום המוצר."}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="כתבו הודעה..."
            className="input flex-1 min-w-0 px-4"
          />
          <button onClick={handleSend} className="btn-primary px-5">
            שליחה
          </button>
        </div>
        {error && <p className="text-rust font-bold m-0">{error}</p>}
      </div>

      <div className="flex flex-col gap-6 min-w-0">
        {itemId && itemExpiryDate && (
          <PickupCoordination itemId={itemId} expiryDate={itemExpiryDate} otherId={otherId} />
        )}

        {canReview && !alreadyReviewed && (
          <form onSubmit={handleSubmitReview} className="card p-5 flex flex-col gap-3">
            <h3 className="display-sm">איך היה המפגש?</h3>
            {reviewMsg && <p className="text-rust font-bold m-0">{reviewMsg}</p>}
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="דירוג">
              {RATINGS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                >
                  {value} - {label}
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="הערה (לא חובה)..."
              rows={3}
              className="input text-[15px] resize-y"
            />
            <button type="submit" className="btn-primary py-3">
              <span>שליחת ביקורת אנונימית</span>
              <span>←</span>
            </button>
          </form>
        )}
        {alreadyReviewed && (
          <p className="font-bold text-[17px] text-green m-0">
            {reviewMsg || "כבר השארתם ביקורת על המפגש הזה. תודה!"}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p className="page">טוען...</p>}>
      <ChatInner />
    </Suspense>
  );
}
