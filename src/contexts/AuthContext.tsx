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

  const fetchUserData = async (userId: string) => {
    // Get user metadata as a fallback source for name / role
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const meta = currentUser?.user_metadata as
      | { full_name?: string; role?: string }
      | undefined;
    const metaRole = meta?.role as AppRole | undefined;

    // ---- Profile ----
    let { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profileData && meta?.full_name) {
      // Row is missing (signup insert may have been blocked by RLS) — create it now
      const { data: inserted } = await supabase
        .from('profiles')
        .upsert({ user_id: userId, full_name: meta.full_name }, { onConflict: 'user_id' })
        .select()
        .maybeSingle();
      profileData = inserted;
    }
    if (profileData) setProfile(profileData);

    // ---- Role ----
    let { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!roleData && metaRole) {
      const { data: inserted } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: metaRole }, { onConflict: 'user_id' })
        .select('role')
        .maybeSingle();
      roleData = inserted;
    }

    if (roleData) {
      const resolvedRole = roleData.role as AppRole;
      setRole(resolvedRole);

      // ---- Student stats ----
      if (resolvedRole === 'student') {
        let { data: statsData } = await supabase
          .from('student_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!statsData) {
          const { data: inserted } = await supabase
            .from('student_stats')
            .upsert(
              { user_id: userId, points: 0, streak_days: 0, tasks_completed: 0 },
              { onConflict: 'user_id' },
            )
            .select()
            .maybeSingle();
          statsData = inserted;
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
      // Even upsert failed — still set role from JWT so the user isn't stuck
      setRole(metaRole);
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

    // Get initial session first – this is the source of truth for the
    // very first render.  Only after it resolves do we flip loading off.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
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
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setStudentStats(null);
        }
      }
    );

    return () => {
      mounted = false;
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
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
