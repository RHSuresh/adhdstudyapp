import { useState } from 'react';
import { Check, Clock, BookOpen, Pencil, FolderOpen, Star, MoreHorizontal } from 'lucide-react';
import { Task, TaskCategory } from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete?: (id: string) => void;
}

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
  homework: <Pencil className="w-4 h-4" />,
  reading: <BookOpen className="w-4 h-4" />,
  project: <FolderOpen className="w-4 h-4" />,
  practice: <Star className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

const categoryLabels: Record<TaskCategory, string> = {
  homework: 'Homework',
  reading: 'Reading',
  project: 'Project',
  practice: 'Practice',
  other: 'Other',
};

export function TaskCard({ task, onToggleComplete }: TaskCardProps) {
  const [isChecked, setIsChecked] = useState(task.completed);

  const handleToggle = () => {
    setIsChecked(!isChecked);
    onToggleComplete(task.id);
  };

  const formatDueDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div
      className={cn(
        'task-card bg-card rounded-2xl p-4 shadow-soft border border-border/50',
        isChecked && 'task-complete'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Custom checkbox */}
        <button
          onClick={handleToggle}
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300',
            isChecked
              ? 'bg-success border-success'
              : 'border-muted-foreground/30 hover:border-primary'
          )}
          aria-label={isChecked ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isChecked && (
            <Check className="w-4 h-4 text-success-foreground check-animate" />
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-semibold text-base leading-tight transition-all duration-300',
              isChecked && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className={cn(
              'text-sm text-muted-foreground mt-1 line-clamp-2',
              isChecked && 'line-through'
            )}>
              {task.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-3">
            {/* Category badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent rounded-full text-xs font-medium text-accent-foreground">
              {categoryIcons[task.category]}
              {categoryLabels[task.category]}
            </span>

            {/* Due date */}
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium',
                  isOverdue ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                {formatDueDate(new Date(task.dueDate))}
              </span>
            )}
          </div>
        </div>

        {/* Priority indicator */}
        <div
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0 mt-2',
            task.priority === 'high' && 'bg-destructive',
            task.priority === 'medium' && 'bg-warning',
            task.priority === 'low' && 'bg-success'
          )}
          title={`${task.priority} priority`}
        />
      </div>
    </div>
  );
}
