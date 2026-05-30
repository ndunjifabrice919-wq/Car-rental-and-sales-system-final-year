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
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  // Track if we've received the INITIAL_SESSION event
  const initialSessionReceived = useRef(false);

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

    // Safety net: if INITIAL_SESSION hasn't fired within 3 seconds, unblock the UI.
    // This fixes the "stuck loading" issue on slow networks or mobile browsers.
    const safetyTimeout = setTimeout(() => {
      if (!initialSessionReceived.current && isMounted.current) {
        setLoading(false);
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;

        // Mark that we've received at least one event (unblocks safety timeout)
        if (event === "INITIAL_SESSION") {
          initialSessionReceived.current = true;
          clearTimeout(safetyTimeout);
        }

        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          // Unblock UI immediately, load profile in background
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
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    // Clear state immediately (optimistic) — UI responds in <100ms
    setUser(null);
    setProfile(null);
    // Fire server signOut in background — don't await
    supabase.auth.signOut().catch(() => {});
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
