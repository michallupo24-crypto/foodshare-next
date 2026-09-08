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
    <div className="mt-6 bg-[var(--paper)] p-4 rounded-2xl border border-[var(--ink-border)]">
      <h3 className="text-xl mb-1">תיאום שעת איסוף</h3>
      <p className="text-sm text-[var(--ink)]/70 mb-3">
        סמנו טווחי שעות נוחים לכם בימים שנותרו עד שהמוצר פג תוקף (עד 14 יום קדימה). כשלשניכם יש טווח באותו יום, החפיפה ביניכם תסומן.
      </p>
      {error && <p className="text-[var(--rust)] mb-2 text-sm">{error}</p>}

      <div className="flex flex-col gap-2">
        {days.map((day) => {
          const mine = mySlots.filter((s) => s.slot_date === day.iso);
          const theirs = theirSlots.filter((s) => s.slot_date === day.iso);
          const draft = drafts[day.iso] ?? { start: "", end: "" };

          return (
            <div key={day.iso} className="flex flex-wrap items-center gap-2 border-t border-[var(--ink-border)] pt-2 first:border-t-0 first:pt-0">
              <div className="min-w-[90px] font-semibold text-sm">{day.label}</div>

              {mine.map((s) => (
                <button
                  key={s.id}
                  onClick={() => removeSlot(s.id)}
                  title="לחצו להסרה"
                  className="bg-[var(--green-chip)] text-[var(--green)] rounded-full px-3 py-1 text-xs"
                >
                  {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} ✕
                </button>
              ))}

              {theirs.map((t) => {
                const overlaps = mine.filter((s) => overlapRange(s, t) !== null);
                if (overlaps.length > 0) {
                  return overlaps.map((s) => (
                    <span key={`${t.id}-${s.id}`} className="bg-[var(--green)] text-[var(--paper)] rounded-full px-3 py-1 text-xs">
                      ✓ חפיפה {overlapRange(s, t)}
                    </span>
                  ));
                }
                return (
                  <span key={t.id} className="border border-dashed border-[var(--rust)] text-[var(--rust)] rounded-full px-3 py-1 text-xs flex items-center gap-1">
                    מוצע ע&quot;י הצד השני: {t.start_time.slice(0, 5)}–{t.end_time.slice(0, 5)}
                    <button
                      onClick={() => addSlot(day.iso, t.start_time.slice(0, 5), t.end_time.slice(0, 5))}
                      className="bg-[var(--rust)] text-[var(--paper)] rounded-full px-2"
                    >
                      גם אני פנוי/ה
                    </button>
                  </span>
                );
              })}

              <div className="flex items-center gap-1 text-xs">
                <input
                  type="time"
                  value={draft.start}
                  onChange={(e) => setDrafts((d) => ({ ...d, [day.iso]: { ...draft, start: e.target.value } }))}
                  className="border rounded px-1 py-0.5"
                />
                <input
                  type="time"
                  value={draft.end}
                  onChange={(e) => setDrafts((d) => ({ ...d, [day.iso]: { ...draft, end: e.target.value } }))}
                  className="border rounded px-1 py-0.5"
                />
                <button
                  onClick={() => addSlot(day.iso, draft.start, draft.end)}
                  className="bg-[var(--paper)] border rounded-full px-2 py-0.5"
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
