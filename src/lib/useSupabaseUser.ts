import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useSupabaseUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
      if (sessionErr) {
        console.warn("useSupabaseUserId getSession error:", sessionErr.message);
      }
      const sessionUser = sessionData.session?.user;
      if (sessionUser) {
        if (!active) return;
        setUserId(sessionUser.id ?? null);
        return;
      }

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
