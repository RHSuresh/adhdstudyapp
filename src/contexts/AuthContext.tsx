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
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
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
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (profileData) {
      setProfile(profileData);
    }

    // Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleData) {
      setRole(roleData.role as AppRole);
      
      // If student, fetch stats
      if (roleData.role === 'student') {
        const { data: statsData } = await supabase
          .from('student_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (statsData) {
          setStudentStats({
            points: statsData.points,
            streak_days: statsData.streak_days,
            tasks_completed: statsData.tasks_completed,
            last_completed_date: statsData.last_completed_date,
          });
        }
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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to avoid potential deadlock
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
        setStudentStats(null);
      }
      setLoading(false);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
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
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            full_name: fullName,
          });
        
        if (profileError) console.error('Profile creation error:', profileError);

        // Create role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: role,
          });
        
        if (roleError) console.error('Role creation error:', roleError);

        // If student, create stats
        if (role === 'student') {
          const { error: statsError } = await supabase
            .from('student_stats')
            .insert({
              user_id: data.user.id,
              points: 0,
              streak_days: 0,
              tasks_completed: 0,
            });
          
          if (statsError) console.error('Stats creation error:', statsError);
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
