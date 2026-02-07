import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { GraduationCap, Users, School } from 'lucide-react';

const roles = [
  { value: 'student', path: '/student', label: 'Student', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'parent', path: '/parent', label: 'Parent', icon: <Users className="w-4 h-4" /> },
  { value: 'teacher', path: '/teacher', label: 'Teacher', icon: <School className="w-4 h-4" /> },
];

export function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-secondary rounded-full">
      {roles.map((role) => (
        <button
          key={role.value}
          onClick={() => navigate(role.path)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
            currentPath === role.path
              ? 'bg-card text-foreground shadow-soft'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {role.icon}
          <span className="hidden sm:inline">{role.label}</span>
        </button>
      ))}
    </div>
  );
}
