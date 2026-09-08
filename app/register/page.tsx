"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const CITIES = ["Tel Aviv", "Jerusalem", "Haifa", "Beersheba"];
const CITY_LABELS: Record<string, string> = {
  "Tel Aviv": "תל אביב",
  Jerusalem: "ירושלים",
  Haifa: "חיפה",
  Beersheba: "באר שבע",
};

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("male");
  const [city, setCity] = useState("Tel Aviv");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function shareLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("הדפדפן לא תומך בשיתוף מיקום.");
      return;
    }
    setLocationStatus("מבקש הרשאה...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationStatus("המיקום שותף בהצלחה. מי שיחפש יראה מרחק מדויק.");
      },
      () => setLocationStatus("שיתוף המיקום נכשל או נדחה - אפשר להירשם גם בלעדיו.")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError || !data.user) {
      setError("ההרשמה נכשלה: " + (signUpError?.message ?? "שגיאה לא ידועה"));
      setBusy(false);
      return;
    }

    const profile: Record<string, unknown> = {
      id: data.user.id,
      username: userName,
      first_name: firstName,
      last_name: lastName,
      birth_year: Number(birthYear),
      gender,
      city,
    };
    if (location) {
      profile.lat = location.lat;
      profile.lon = location.lon;
    }

    const { error: profileError } = await supabase.from("profiles").insert(profile);

    setBusy(false);

    if (profileError) {
      setError(
        "החשבון נוצר אך שמירת פרטי הפרופיל נכשלה (ייתכן ששם המשתמש כבר תפוס): " +
          profileError.message
      );
      return;
    }

    router.push("/board");
  }

  return (
    <div className="max-w-md mx-auto bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)]">
      <h2 className="text-2xl mb-4">הצטרפות לקהילה</h2>
      {error && <p className="text-[var(--rust)] mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required placeholder="שם פרטי" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required placeholder="שם משפחה" value={lastName} onChange={(e) => setLastName(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required placeholder="שם משתמש" value={userName} onChange={(e) => setUserName(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="password" placeholder="סיסמה" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input required type="number" placeholder="שנת לידה" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="border rounded-lg px-3 py-2" />
        <div className="flex gap-4">
          <label><input type="radio" name="gender" checked={gender === "male"} onChange={() => setGender("male")} /> זכר</label>
          <label><input type="radio" name="gender" checked={gender === "female"} onChange={() => setGender("female")} /> נקבה</label>
        </div>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="border rounded-lg px-3 py-2">
          {CITIES.map((c) => (
            <option key={c} value={c}>{CITY_LABELS[c]}</option>
          ))}
        </select>
        <button type="button" onClick={shareLocation} className="border rounded-full px-4 py-2 text-[var(--green)]">
          שיתוף מיקום לחישוב מרחק מדויק (לא חובה)
        </button>
        {locationStatus && <p className="text-sm text-[var(--ink)]/70">{locationStatus}</p>}
        <button disabled={busy} type="submit" className="bg-[var(--green)] text-[var(--paper)] rounded-full px-4 py-2 mt-2">
          {busy ? "נרשמת/ה..." : "הירשם"}
        </button>
      </form>
    </div>
  );
}
