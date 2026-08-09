import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthContext } from './auth';

function normalizeProfile(profile, authUser) {
  if (!profile || !authUser) return null;
  const names = profile.full_name.trim().split(/\s+/);

  return {
    id: profile.id,
    fullName: profile.full_name,
    firstName: names[0] ?? '',
    lastName: names.slice(1).join(' '),
    email: authUser.email ?? '',
    role: profile.role.toUpperCase(),
    departmentId: profile.department_id,
    active: profile.active,
  };
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authSession) => {
    if (!authSession?.user) {
      setSession(null);
      setUser(null);
      setRole(null);
      return null;
    }

    const supabase = getSupabase();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, department_id, active')
      .eq('id', authSession.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!profile?.active) {
      await supabase.auth.signOut();
      throw new Error('This account is not active. Contact a system administrator.');
    }

    const normalized = normalizeProfile(profile, authSession.user);
    setSession(authSession);
    setUser(normalized);
    setRole(normalized.role);
    return normalized;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      try {
        if (mounted) await loadProfile(data.session);
      } catch (error) {
        console.error('Unable to restore session:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          loadProfile(nextSession).catch(console.error).finally(() => setLoading(false));
        }, 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = async (email, password, allowedRoles) => {
    if (!isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    try {
      const profile = await loadProfile(data.session);
      if (allowedRoles?.length && !allowedRoles.includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error('This account does not have access to this portal.');
      }
      return profile;
    } catch (profileError) {
      await supabase.auth.signOut();
      throw profileError;
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) await getSupabase().auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

  const refreshProfile = async () => loadProfile(session);

  const value = {
    user,
    role,
    token: session?.access_token ?? null,
    session,
    login,
    logout,
    refreshProfile,
    isAuthenticated: Boolean(session && user),
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
