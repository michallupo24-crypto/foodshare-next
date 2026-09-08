"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

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

  return (
    <div>
      <h2 className="text-3xl mb-4">פאנל ניהול</h2>
      {message && <p className="text-[var(--green)] mb-3">{message}</p>}

      <h3 className="text-xl mb-2">דיווחי תמונות ({reports.length})</h3>
      {reports.length === 0 ? (
        <p className="text-sm text-[var(--ink)]/70 mb-6">אין דיווחים ממתינים.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {reports.map((r) => (
            <div key={r.id} className="bg-[var(--paper)] border border-[var(--ink-border)] rounded-xl p-3 flex justify-between items-center">
              <div className="text-sm">
                מוצר #{r.item_id} · {r.reason}
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => resolveReport(r.id, false)} className="text-[var(--green)]">בטל דיווח (שחזר תמונה)</button>
                <button onClick={() => resolveReport(r.id, true)} className="text-[var(--rust)]">אשר דיווח (השאר חסום)</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-xl mb-2">משתמשים ({users.length})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-[var(--paper)] border border-[var(--ink-border)] rounded-xl">
          <thead>
            <tr className="text-right border-b border-[var(--ink-border)]">
              <th className="p-2">שם משתמש</th>
              <th className="p-2">עיר</th>
              <th className="p-2">נקודות אמון</th>
              <th className="p-2">כניסות</th>
              <th className="p-2">מנהל/ת</th>
              <th className="p-2">חסום</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--ink-border)]">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.city}</td>
                <td className="p-2">{u.trust_points}</td>
                <td className="p-2">{u.login_count}</td>
                <td className="p-2">
                  {u.id === userId ? (
                    "-"
                  ) : (
                    <button onClick={() => toggleAdmin(u.id, u.is_admin)} className="text-[var(--green)]">
                      {u.is_admin ? "בטל הרשאה" : "הפוך למנהל/ת"}
                    </button>
                  )}
                </td>
                <td className="p-2">
                  {u.id === userId ? (
                    "-"
                  ) : (
                    <button onClick={() => toggleBlocked(u.id, u.is_blocked)} className="text-[var(--rust)]">
                      {u.is_blocked ? "בטל חסימה" : "חסום"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
