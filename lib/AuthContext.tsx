"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";

type Profile = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  city: string;
  is_admin: boolean;
  login_count: number;
  trust_points: number;
  is_blocked: boolean;
};

type AuthContextType = {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  userId: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,first_name,last_name,city,is_admin,login_count,trust_points,is_blocked")
      .eq("id", uid)
      .single();
    setProfile(data as Profile | null);
  }

  async function refreshProfile() {
    if (userId) await loadProfile(userId);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) loadProfile(uid).finally(() => setInitializing(false));
      else setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      if (!uid) {
        setProfile(null);
        setUserId(null);
        return;
      }
      setUserId(uid);
      loadProfile(uid);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // loading covers both the initial session check AND the gap right after
  // sign-in where userId is already set but the profile row hasn't arrived
  // yet - without this, a page guarding on profile.is_admin (like the admin
  // panel) reads a stale null profile and redirects away before it loads.
  const loading = initializing || (userId !== null && profile?.id !== userId);

  return (
    <AuthContext.Provider value={{ userId, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
