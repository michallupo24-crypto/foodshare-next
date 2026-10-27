"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

type Slot = { id: number; slot_date: string; start_time: string; end_time: string };

function buildDayList(expiryDate: string) {
  const days: { iso: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00");
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d > expiry) break;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric" });
    days.push({ iso, label });
  }
  return days;
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlapRange(a: Slot, b: Slot): string | null {
  const start = Math.max(toMinutes(a.start_time), toMinutes(b.start_time));
  const end = Math.min(toMinutes(a.end_time), toMinutes(b.end_time));
  if (start >= end) return null;
  const pad = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return `${pad(start)}–${pad(end)}`;
}

export default function PickupCoordination({ itemId, expiryDate, otherId }: { itemId: string; expiryDate: string; otherId: string }) {
  const { userId } = useAuth();
  const [mySlots, setMySlots] = useState<Slot[]>([]);
  const [theirSlots, setTheirSlots] = useState<Slot[]>([]);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { start: string; end: string }>>({});

  const fetchSlots = useCallback(async () => {
    if (!userId) return;
    const [mine, theirs] = await Promise.all([
      supabase.rpc("get_pickup_slots", { target_item: Number(itemId), target_user: userId }),
      supabase.rpc("get_pickup_slots", { target_item: Number(itemId), target_user: otherId }),
    ]);
    setMySlots((mine.data ?? []) as Slot[]);
    setTheirSlots((theirs.data ?? []) as Slot[]);
  }, [itemId, otherId, userId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  async function addSlot(dateIso: string, start: string, end: string) {
    if (!start || !end) return;
    const { error: rpcError } = await supabase.rpc("add_pickup_slot", {
      target_item: Number(itemId),
      target_date: dateIso,
      start_t: start,
      end_t: end,
    });
    if (rpcError) {
      setError("הוספת הטווח נכשלה: " + rpcError.message);
      return;
    }
    setError("");
    fetchSlots();
  }

  async function removeSlot(id: number) {
    await supabase.rpc("remove_pickup_slot", { target_id: id });
    fetchSlots();
  }

  const days = buildDayList(expiryDate);

  return (
    <div className="card pt-[30px] px-5 pb-5 flex flex-col gap-2.5">
      <i className="pin top-3 right-3.5" />
      <h3 className="display-sm">תיאום שעת איסוף</h3>
      <p className="text-sm text-ink/70 m-0 [text-wrap:pretty]">
        סמנו טווחי שעות נוחים לכם בימים שנותרו עד שהמוצר פג תוקף (עד 14 יום קדימה). כשלשניכם יש טווח באותו יום, החפיפה ביניכם תסומן.
      </p>
      {error && <p className="text-rust font-bold text-sm m-0">{error}</p>}

      <div className="flex flex-col">
        {days.map((day) => {
          const mine = mySlots.filter((s) => s.slot_date === day.iso);
          const theirs = theirSlots.filter((s) => s.slot_date === day.iso);
          const draft = drafts[day.iso] ?? { start: "", end: "" };

          return (
            <div key={day.iso} className="flex flex-wrap items-center gap-1.5 py-2.5 dashed-top">
              <div className="min-w-[84px] font-bold text-[15px]">{day.label}</div>

              {mine.map((s) => (
                <button
                  key={s.id}
                  onClick={() => removeSlot(s.id)}
                  title="לחצו להסרה"
                  className="bg-[var(--green-chip)] text-green rounded px-2.5 py-1 text-xs font-bold cursor-pointer"
                >
                  {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} ✕
                </button>
              ))}

              {theirs.map((t) => {
                const overlaps = mine.filter((s) => overlapRange(s, t) !== null);
                if (overlaps.length > 0) {
                  return overlaps.map((s) => (
                    <span key={`${t.id}-${s.id}`} className="bg-green text-paper border border-green rounded px-2.5 py-1 text-xs font-bold">
                      ✓ חפיפה {overlapRange(s, t)}
                    </span>
                  ));
                }
                return (
                  <span key={t.id} className="border border-dashed border-rust text-rust rounded px-2.5 py-1 text-xs font-bold flex items-center gap-1.5">
                    מוצע ע&quot;י הצד השני: {t.start_time.slice(0, 5)}–{t.end_time.slice(0, 5)}
                    <button
                      onClick={() => addSlot(day.iso, t.start_time.slice(0, 5), t.end_time.slice(0, 5))}
                      className="bg-rust text-paper rounded px-2 py-px cursor-pointer"
                    >
                      גם אני פנוי/ה
                    </button>
                  </span>
                );
              })}

              <div className="flex items-center gap-1 text-xs">
                <input
                  type="time"
                  aria-label="משעה"
                  value={draft.start}
                  onChange={(e) => setDrafts((d) => ({ ...d, [day.iso]: { ...draft, start: e.target.value } }))}
                  className="border-[1.3px] border-[var(--ink-border)] rounded px-1 py-0.5 bg-white"
                />
                <input
                  type="time"
                  aria-label="עד שעה"
                  value={draft.end}
                  onChange={(e) => setDrafts((d) => ({ ...d, [day.iso]: { ...draft, end: e.target.value } }))}
                  className="border-[1.3px] border-[var(--ink-border)] rounded px-1 py-0.5 bg-white"
                />
                <button
                  onClick={() => addSlot(day.iso, draft.start, draft.end)}
                  className="border-[1.3px] border-[var(--ink-border)] rounded px-2.5 py-0.5 bg-paper font-semibold cursor-pointer"
                >
                  הוסיפו טווח
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
