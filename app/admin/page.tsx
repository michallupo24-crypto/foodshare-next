"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { CITY_LABELS } from "@/lib/constants";

type UserRow = {
  id: string;
  username: string;
  city: string;
  is_admin: boolean;
  is_blocked: boolean;
  trust_points: number;
  login_count: number;
};

type ReportRow = {
  id: number;
  item_id: number;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
};

export default function AdminPanelPage() {
  const { userId, profile, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && (!userId || !profile?.is_admin)) router.push("/board");
  }, [loading, userId, profile, router]);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,city,is_admin,is_blocked,trust_points,login_count")
      .order("username");
    setUsers((data ?? []) as UserRow[]);
  }, []);

  const loadReports = useCallback(async () => {
    const { data } = await supabase
      .from("photo_reports")
      .select("id,item_id,reporter_id,reason,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setReports((data ?? []) as ReportRow[]);
  }, []);

  useEffect(() => {
    if (profile?.is_admin) {
      loadUsers();
      loadReports();
    }
  }, [profile, loadUsers, loadReports]);

  async function toggleAdmin(id: string, current: boolean) {
    const { error } = await supabase.rpc("set_admin_status", { target_user: id, new_value: !current });
    setMessage(error ? "פעולה נכשלה: " + error.message : "עודכן.");
    loadUsers();
  }

  async function toggleBlocked(id: string, current: boolean) {
    const { error } = await supabase.rpc("set_user_blocked", { target_user: id, blocked: !current });
    setMessage(error ? "פעולה נכשלה: " + error.message : "עודכן.");
    loadUsers();
  }

  async function resolveReport(id: number, uphold: boolean) {
    const { error } = await supabase.rpc("resolve_photo_report", { report_id: id, upheld: uphold });
    setMessage(error ? "פעולה נכשלה: " + error.message : "טופל.");
    loadReports();
  }

  if (!profile?.is_admin) return null;

  const cell = "px-4 py-3 dashed-bottom";

  return (
    <div className="page flex flex-col gap-8">
      <div className="page-head">
        <div className="eyebrow">פאנל ניהול</div>
        <h1 className="display">
          <span className="text-rust">{reports.length}</span> דיווחים ממתינים
        </h1>
        {message && <p className="text-sm font-bold text-green m-0">{message}</p>}
      </div>

      <section className="flex flex-col gap-2.5">
        <h3 className="display-sm">דיווחי תמונות</h3>
        {reports.length === 0 ? (
          <p className="text-[15px] text-ink/60 m-0">אין דיווחים ממתינים.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="card px-[18px] py-3.5 flex justify-between items-center gap-3 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <b className="text-base">מוצר #{r.item_id}</b>
                <span className="text-[13px] text-ink/60">{r.reason}</span>
              </div>
              <div className="flex gap-2 flex-wrap text-sm font-bold">
                <button onClick={() => resolveReport(r.id, false)} className="border-[1.3px] border-ink rounded px-3.5 py-[7px] text-green cursor-pointer">
                  בטל דיווח (שחזר תמונה)
                </button>
                <button onClick={() => resolveReport(r.id, true)} className="rounded px-3.5 py-[7px] bg-rust text-paper cursor-pointer">
                  אשר דיווח (השאר חסום)
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="display-sm">משתמשים ({users.length})</h3>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr className="text-right text-xs font-bold tracking-[.04em] text-ink/55">
                <th className={`${cell} font-bold`}>שם משתמש</th>
                <th className={`${cell} font-bold`}>עיר</th>
                <th className={`${cell} font-bold`}>נקודות אמון</th>
                <th className={`${cell} font-bold`}>כניסות</th>
                <th className={`${cell} font-bold`}>מנהל/ת</th>
                <th className={`${cell} font-bold`}>חסום</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={`${cell} font-bold ${u.is_blocked ? "text-ink/40" : ""}`}>{u.username}</td>
                  <td className={cell}>{CITY_LABELS[u.city] ?? u.city}</td>
                  <td className={cell}>{u.trust_points}</td>
                  <td className={cell}>{u.login_count}</td>
                  <td className={cell}>
                    {u.id === userId ? (
                      "-"
                    ) : (
                      <button onClick={() => toggleAdmin(u.id, u.is_admin)} className="text-green font-bold cursor-pointer">
                        {u.is_admin ? "בטל הרשאה" : "הפוך למנהל/ת"}
                      </button>
                    )}
                  </td>
                  <td className={cell}>
                    {u.id === userId ? (
                      "-"
                    ) : (
                      <button onClick={() => toggleBlocked(u.id, u.is_blocked)} className="text-rust font-bold cursor-pointer">
                        {u.is_blocked ? "בטל חסימה" : "חסום"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
