"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  const fetchProfile = async (u: any) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, verification_status, id_number, id_document_url")
      .eq("id", u.id)
      .single();
      
    if (!data) {
      // Auto-create missing profile
      const rawMeta = u.user_metadata || {};
      const fullName = rawMeta.full_name || u.email?.split("@")[0] || "User";
      const phone = rawMeta.phone || "";
      
      const { data: newProfile, error } = await supabase.from("profiles").upsert({
        id: u.id,
        full_name: fullName,
        phone: phone,
        role: "customer"
      }, { onConflict: "id" }).select("id, full_name, phone, role, verification_status, id_number, id_document_url").single();
      
      if (error) {
        console.error("❌ Profile Auto-creation failed:", error);
      }
      
      setProfile(newProfile ?? null);
    } else {
      setProfile(data);
    }
  };

  useEffect(() => {
    // Single session check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await fetchProfile(u);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook — use this in every page/component instead of calling supabase.auth.getSession()
export const useAuth = () => useContext(AuthContext);
