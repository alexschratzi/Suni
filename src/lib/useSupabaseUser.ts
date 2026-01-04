import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useSupabaseUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("useSupabaseUserId getUser error:", error.message);
      }
      if (!active) return;
      setUserId(data.user?.id ?? null);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
