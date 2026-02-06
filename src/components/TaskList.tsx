import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { CheckCircle2, Circle } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
}

export function TaskList({ tasks, onToggleComplete }: TaskListProps) {
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No tasks yet!</h3>
        <p className="text-muted-foreground text-sm">
          Ask the chatbot to add a task for you 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active tasks */}
      {incompleteTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Circle className="w-4 h-4" />
            <span>To Do ({incompleteTasks.length})</span>
          </div>
          <div className="space-y-3">
            {incompleteTasks.map((task, index) => (
              <div
                key={task.id}
                className="animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TaskCard task={task} onToggleComplete={onToggleComplete} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed ({completedTasks.length})</span>
          </div>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggleComplete={onToggleComplete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
