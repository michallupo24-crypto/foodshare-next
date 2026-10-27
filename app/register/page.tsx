"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LocationPreviewMap from "@/components/LocationPreviewMap";
import { CITIES, CITY_LABELS } from "@/lib/constants";

const GENDERS = [
  ["female", "נקבה"],
  ["male", "זכר"],
];

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
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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
      address: address.trim() || null,
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
    <div className="page split">
      <div className="flex flex-col gap-3.5 pt-2">
        <div className="eyebrow">הרשמה</div>
        <h1 className="display text-[80px]">
          הצטרפות <span className="text-rust">לקהילה</span>
        </h1>
        <p className="lede m-0">שיתוף מיקום הוא לא חובה. בלעדיו המרחק מחושב לפי העיר.</p>
      </div>

      <form onSubmit={handleSubmit} className="card form-card">
        <i className="pin" />
        {error && <p className="text-rust font-bold m-0">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            שם פרטי
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" />
          </label>
          <label className="field">
            שם משפחה
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" />
          </label>
        </div>
        <label className="field">
          שם משתמש
          <input required value={userName} onChange={(e) => setUserName(e.target.value)} className="input" />
        </label>
        <label className="field">
          אימייל
          <input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="input text-right" />
        </label>
        <label className="field">
          סיסמה
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </label>
        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="field">
            שנת לידה
            <input required type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="input" />
          </label>
          <div className="flex gap-1.5" role="group" aria-label="מגדר">
            {GENDERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="chip flex-1 justify-center text-[15px] py-2.5"
                aria-pressed={gender === value}
                onClick={() => setGender(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          עיר
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input">
            {CITIES.map((c) => (
              <option key={c} value={c}>{CITY_LABELS[c]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          כתובת
          <input
            placeholder="כתובת (רחוב, שכונה...) - לא חובה"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
          />
        </label>
        <button type="button" onClick={shareLocation} className="btn-outline">
          שיתוף מיקום לחישוב מרחק מדויק (לא חובה)
        </button>
        {locationStatus && <p className="text-sm text-ink/70 m-0">{locationStatus}</p>}
        {location && <LocationPreviewMap lat={location.lat} lon={location.lon} />}
        <label className="flex items-center gap-2 text-sm">
          <input
            required
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-[18px] h-[18px] accent-green"
          />
          <span>
            קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank" className="underline font-bold">תנאי השימוש</Link>
          </span>
        </label>
        <button disabled={busy} type="submit" className="btn-primary mt-2">
          <span>{busy ? "נרשמת/ה..." : "הירשם"}</span>
          <span>←</span>
        </button>
      </form>
    </div>
  );
}
