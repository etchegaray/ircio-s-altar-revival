import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { type AppRole, MANAGER_ROLES, hasAnyRole } from '@/lib/permissions';

export const useAuth = () => {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles]     = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const userRoles = (data ?? []).map((r) => r.role as AppRole);
    if (isMounted.current) setRoles(userRoles);
    return userRoles;
  }, []);

  useEffect(() => {
    isMounted.current = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted.current) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchRoles(session.user.id);
      if (isMounted.current) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setRoles([]);
          setLoading(false);
          return;
        }
        fetchRoles(session.user.id).then(() => {
          if (isMounted.current) setLoading(false);
        });
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchRoles]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  return {
    user,
    session,
    roles,
    // Convenience flags
    isAdmin:       roles.includes('admin'),
    isManager:     hasAnyRole(roles, MANAGER_ROLES),
    // Generic checker used by ProtectedRoute and UI gates
    hasRole:       (role: AppRole) => roles.includes(role),
    hasAnyRole:    (required: AppRole[]) => hasAnyRole(roles, required),
    loading,
    signIn,
    signOut,
  };
};
