"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin" | "owner";
  id_type?: string | null;
  id_number?: string | null;
  id_document_url?: string | null;
  verification_status?: "unverified" | "pending" | "verified" | null;
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Start loading=true; flip to false once we have the initial session
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchProfile = async (u: any): Promise<Profile | null> => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, verification_status, id_number, id_document_url")
        .eq("id", u.id)
        .single();

      if (data) return data;

      // Auto-create missing profile (e.g. Google OAuth users)
      const rawMeta = u.user_metadata || {};
      const fullName = rawMeta.full_name || rawMeta.name || u.email?.split("@")[0] || "User";
      const phone = rawMeta.phone || "";

      const { data: newProfile } = await supabase
        .from("profiles")
        .upsert({ id: u.id, full_name: fullName, phone, role: "customer" }, { onConflict: "id" })
        .select("id, full_name, phone, role, verification_status, id_number, id_document_url")
        .single();

      return newProfile ?? null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    isMounted.current = true;

    // Use onAuthStateChange as the SINGLE source of truth.
    // It fires immediately on mount with the persisted session (INITIAL_SESSION event),
    // so we don't need a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;

        if (!isMounted.current) return;
        setUser(u);

        if (u) {
          // Don't block UI — resolve loading immediately, then fetch profile in background
          setLoading(false);
          const prof = await fetchProfile(u);
          if (isMounted.current) setProfile(prof);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const prof = await fetchProfile(user);
    if (isMounted.current) setProfile(prof);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
