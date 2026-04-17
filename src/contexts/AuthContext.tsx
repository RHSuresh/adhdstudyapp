import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'student' | 'parent' | 'teacher';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface StudentStats {
  points: number;
  streak_days: number;
  tasks_completed: number;
  last_completed_date: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  studentStats: StudentStats | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole, inviteCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper: race a promise/thenable against a timeout so DB calls can't hang forever
  const withTimeout = <T,>(thenable: PromiseLike<T>, ms = 4000): Promise<T> =>
    Promise.race([
      Promise.resolve(thenable),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Supabase query timed out after ${ms}ms`)), ms),
      ),
    ]);

  const fetchUserData = async (userId: string, userMeta?: Record<string, unknown>) => {
    console.log('[AUTH] fetchUserData START for', userId, 'meta:', userMeta);
    // Declare outside try so catch can access it
    let meta = userMeta as { full_name?: string; role?: string } | undefined;
    try {
      // Use metadata passed from the session (no extra network call).
      // Fall back to getUser() only if metadata wasn't supplied.
      if (!meta?.role) {
        console.log('[AUTH] No role in meta, calling getUser()...');
        try {
          const { data: { user: currentUser } } = await withTimeout(supabase.auth.getUser());
          meta = currentUser?.user_metadata as typeof meta;
          console.log('[AUTH] getUser() returned meta:', meta);
        } catch {
          console.warn('[AUTH] getUser() network call failed');
        }
      }
      const metaRole = meta?.role as AppRole | undefined;

      console.log('[AUTH] metaRole:', metaRole);

      // ---- Profile ----
      console.log('[AUTH] Fetching profile...');
      let { data: profileData } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      );

      if (!profileData && meta?.full_name) {
        console.log('[AUTH] Profile missing, upserting...');
        const { data: inserted, error: upsertErr } = await withTimeout(
          supabase
            .from('profiles')
            .upsert({ user_id: userId, full_name: meta.full_name }, { onConflict: 'user_id' })
            .select()
            .maybeSingle()
        );
        if (upsertErr) console.warn('[AUTH] Profile upsert failed:', upsertErr.message);
        else profileData = inserted;
      }
      if (profileData) setProfile(profileData);
      console.log('[AUTH] Profile result:', profileData ? 'found' : 'missing');

      // ---- Role ----
      console.log('[AUTH] Fetching role...');
      let { data: roleData } = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      );

      if (!roleData && metaRole) {
        console.log('[AUTH] Role missing, upserting...');
        const { data: inserted, error: upsertErr } = await withTimeout(
          supabase
            .from('user_roles')
            .upsert({ user_id: userId, role: metaRole }, { onConflict: 'user_id' })
            .select('role')
            .maybeSingle()
        );
        if (upsertErr) console.warn('[AUTH] Role upsert failed:', upsertErr.message);
        else roleData = inserted;
      }

      if (roleData) {
        const resolvedRole = roleData.role as AppRole;
        console.log('[AUTH] Role resolved:', resolvedRole);
        setRole(resolvedRole);

        // ---- Student stats ----
        if (resolvedRole === 'student') {
          let { data: statsData } = await withTimeout(
            supabase
              .from('student_stats')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle()
          );

          if (!statsData) {
            const { data: inserted, error: upsertErr } = await withTimeout(
              supabase
                .from('student_stats')
                .upsert(
                  { user_id: userId, points: 0, streak_days: 0, tasks_completed: 0 },
                  { onConflict: 'user_id' },
                )
                .select()
                .maybeSingle()
            );
            if (upsertErr) console.warn('[AUTH] Stats upsert failed:', upsertErr.message);
            else statsData = inserted;
          }

          if (statsData) {
            setStudentStats({
              points: statsData.points,
              streak_days: statsData.streak_days,
              tasks_completed: statsData.tasks_completed,
              last_completed_date: statsData.last_completed_date,
            });
          }
        }
      } else if (metaRole) {
        console.log('[AUTH] Using metaRole fallback:', metaRole);
        setRole(metaRole);
      } else {
        console.warn('[AUTH] could not determine role for', userId);
      }
    } catch (err) {
      console.error('[AUTH] fetchUserData CATCH:', err);
      // Last-resort fallback: use the metadata we already have
      if (meta?.role) {
        console.log('[AUTH] Using meta fallback after error:', meta.role);
        setRole(meta.role as AppRole);
      }
    }
  };

  const refreshStats = async () => {
    if (!user || role !== 'student') return;
    
    const { data: statsData } = await supabase
      .from('student_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (statsData) {
      setStudentStats({
        points: statsData.points,
        streak_days: statsData.streak_days,
        tasks_completed: statsData.tasks_completed,
        last_completed_date: statsData.last_completed_date,
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety net: never stay in loading state for more than 5 seconds.
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading safety timeout reached — forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    // Get initial session first – this is the source of truth for the
    // very first render.  Only after it resolves do we flip loading off.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AUTH] getSession result:', session ? `user=${session.user.id}` : 'no session');
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          await fetchUserData(session.user.id, session.user.user_metadata);
        } catch (err) {
          console.error('[AUTH] getSession fetchUserData failed:', err);
        }
      }
      console.log('[AUTH] Setting loading=false');
      if (mounted) setLoading(false);
    });

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh).
    // We intentionally do NOT set loading here to avoid a flash of the
    // login page during token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            await fetchUserData(session.user.id, session.user.user_metadata);
          } catch (err) {
            console.error('onAuthStateChange fetchUserData failed:', err);
          }
        } else {
          setProfile(null);
          setRole(null);
          setStudentStats(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, inviteCode?: string) => {
    try {
      const redirectUrl = window.location.origin;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role,
            invite_code: inviteCode || null,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Best-effort row creation. If the session isn't active yet (e.g.
        // email confirmation required) these may fail due to RLS — that's fine
        // because fetchUserData will auto-create them on next login.
        await supabase
          .from('profiles')
          .upsert({ user_id: data.user.id, full_name: fullName }, { onConflict: 'user_id' });

        await supabase
          .from('user_roles')
          .upsert({ user_id: data.user.id, role: role }, { onConflict: 'user_id' });

        // If student, create stats
        if (role === 'student') {
          await supabase
            .from('student_stats')
            .upsert(
              { user_id: data.user.id, points: 0, streak_days: 0, tasks_completed: 0 },
              { onConflict: 'user_id' },
            );
        }

        // If parent with invite code, redeem it
        if (role === 'parent' && inviteCode) {
          const { data: codeData, error: codeError } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('code', inviteCode)
            .is('used_by', null)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

          if (codeData) {
            // Mark code as used
            await supabase
              .from('invite_codes')
              .update({ used_by: data.user.id, used_at: new Date().toISOString() })
              .eq('id', codeData.id);
          } else if (codeError) {
            console.error('Invite code error:', codeError);
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Eagerly set user & session so ProtectedRoute doesn't redirect
      // before onAuthStateChange fires.
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
      if (data.user) {
        try {
          await fetchUserData(data.user.id, data.user.user_metadata);
        } catch (err) {
          console.error('signIn fetchUserData failed:', err);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setStudentStats(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      studentStats,
      loading,
      signUp,
      signIn,
      signOut,
      refreshStats,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
