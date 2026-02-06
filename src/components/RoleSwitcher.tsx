import { UserRole } from '@/types/task';
import { cn } from '@/lib/utils';
import { GraduationCap, Users, School } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const roles: { value: UserRole; label: string; icon: React.ReactNode }[] = [
  { value: 'student', label: 'Student', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'parent', label: 'Parent', icon: <Users className="w-4 h-4" /> },
  { value: 'teacher', label: 'Teacher', icon: <School className="w-4 h-4" /> },
];

export function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-secondary rounded-full">
      {roles.map((role) => (
        <button
          key={role.value}
          onClick={() => onRoleChange(role.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
            currentRole === role.value
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
