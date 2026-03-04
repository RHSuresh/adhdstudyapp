import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setRedirectPath(`/auth/${requiredRole}`);
      setChecking(false);
      return;
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const roles = data?.map((r) => r.role) || [];

        if (roles.includes(requiredRole)) {
          setHasAccess(true);
        } else if (roles.length > 0) {
          // Redirect to their actual role's dashboard
          setRedirectPath(roleToPath[roles[0] as AppRole] || '/');
        } else {
          setRedirectPath('/');
        }
        setChecking(false);
      });
  }, [user, loading, requiredRole]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
