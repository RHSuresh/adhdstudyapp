export type UserRole = 'student' | 'parent' | 'teacher';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskCategory = 'homework' | 'reading' | 'project' | 'study' | 'other';

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
