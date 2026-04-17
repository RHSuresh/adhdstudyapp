import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'student' | 'parent' | 'teacher';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: AppRole;
}

const roleToPath: Record<AppRole, string> = {
  student: '/student',
  parent: '/parent',
  teacher: '/teacher',
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading, signOut } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // If we have a user but no role after auth finishes loading, start a timer.
  // After 6 seconds, give up and let the user retry.
  useEffect(() => {
    if (!loading && user && !role) {
      const id = setTimeout(() => setTimedOut(true), 6000);
      return () => clearTimeout(id);
    }
    // Reset if role arrives
    if (role) setTimedOut(false);
  }, [loading, user, role]);

  // Still loading auth state — show spinner, never redirect yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not logged in — send to the appropriate auth page
  if (!user) {
    return <Navigate to={`/auth/${requiredRole}`} replace />;
  }

  // Role not loaded yet
  if (!role) {
    // Timed out — show error with sign-out option so user isn't stuck
    if (timedOut) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
          <p className="text-lg font-medium">Something went wrong loading your account.</p>
          <p className="text-sm text-muted-foreground">Please sign out and try again.</p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Sign Out & Retry
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Wrong role — redirect to their actual dashboards
  if (role !== requiredRole) {
    return <Navigate to={roleToPath[role] || '/'} replace />;
  }

  return <>{children}</>;
}