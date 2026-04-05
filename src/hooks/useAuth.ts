import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const checkAdminRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (isMounted.current) {
      setIsAdmin(!!data);
    }
    return !!data;
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // 1. Restore session from storage first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted.current) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkAdminRole(session.user.id);
      }
      if (isMounted.current) {
        setLoading(false);
      }
    });

    // 2. Listen for subsequent auth changes (sign in/out) — don't await inside
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        // Fire and forget — don't block the callback
        checkAdminRole(session.user.id).then(() => {
          if (isMounted.current) {
            setLoading(false);
          }
        });
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [checkAdminRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return { user, session, isAdmin, loading, signIn, signOut };
};
