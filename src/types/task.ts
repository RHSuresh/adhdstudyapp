export type UserRole = 'student' | 'parent' | 'teacher';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskCategory = 'homework' | 'reading' | 'project' | 'practice' | 'other';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  priority: TaskPriority;
  category: TaskCategory;
  createdBy: UserRole;
  createdAt: Date;
  reminder?: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentStats {
  id: string;
  user_id: string;
  points: number;
  streak_days: number;
  tasks_completed: number;
  last_completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
}

export interface StudentBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}
