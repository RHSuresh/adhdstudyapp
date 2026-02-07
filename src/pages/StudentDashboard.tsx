import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskList } from '@/components/TaskList';
import { ChatBot } from '@/components/ChatBot';
import { DancingOwl } from '@/components/DancingOwl';
import { GamificationPanel } from '@/components/GamificationPanel';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { generateBotResponse } from '@/lib/chat-helpers';
import { Sparkles, LogOut, MessageCircle, ListTodo, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/types/task';

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  due_date: string | null;
  completed: boolean;
  completion_requested: boolean;
  completion_approved: boolean;
  points_awarded: number;
}

export default function StudentDashboard() {
  const { user, profile, studentStats, signOut, refreshStats } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeView, setActiveView] = useState<'tasks' | 'chat' | 'rewards'>('tasks');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth/student');
      return;
    }
    fetchTasks();
  }, [user, navigate]);

  const fetchTasks = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const handleRequestCompletion = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.completion_requested) {
      // Already requested, do nothing
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ 
        completion_requested: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error requesting completion:', error);
    } else {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, completion_requested: true } : t
      ));
    }
  };

  const handleSendMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Convert tasks to the format expected by generateBotResponse
    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      completed: t.completed || t.completion_approved,
      dueDate: t.due_date ? new Date(t.due_date) : undefined,
      priority: t.priority as 'low' | 'medium' | 'high',
      category: t.category as 'homework' | 'reading' | 'project' | 'study' | 'other',
      createdBy: 'teacher' as const,
      createdAt: new Date(),
    }));

    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: generateBotResponse(content, formattedTasks),
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const incompleteTasks = tasks.filter(t => !t.completion_approved).length;
  const pendingApproval = tasks.filter(t => t.completion_requested && !t.completion_approved).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">
                  Hi, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
                </h1>
                <p className="text-xs text-muted-foreground">
                  {studentStats?.points || 0} points • {studentStats?.streak_days || 0} day streak 🔥
                </p>
              </div>
            </div>

            <RoleSwitcher />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile View Toggle */}
      <div className="lg:hidden sticky top-[73px] z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-full">
            {[
              { id: 'tasks', icon: ListTodo, label: 'Tasks', count: incompleteTasks },
              { id: 'chat', icon: MessageCircle, label: 'Chat' },
              { id: 'rewards', icon: Trophy, label: 'Rewards' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as typeof activeView)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeView === item.id
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dancing Owl */}
      <DancingOwl />

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Tasks Panel */}
          <div className={`lg:col-span-5 ${activeView === 'tasks' ? 'block' : 'hidden lg:block'}`}>
            <div className="mb-4">
              <h2 className="font-bold text-xl">My Tasks</h2>
              <p className="text-sm text-muted-foreground">
                {incompleteTasks === 0
                  ? 'All done! Amazing job! 🎉'
                  : `${incompleteTasks} task${incompleteTasks !== 1 ? 's' : ''} to complete`}
                {pendingApproval > 0 && ` • ${pendingApproval} awaiting approval`}
              </p>
            </div>
            
            {tasks.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-8 text-center">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No tasks yet!</h3>
                <p className="text-muted-foreground text-sm">
                  Your teacher will assign tasks for you soon.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`bg-card rounded-2xl p-4 shadow-soft border border-border/50 transition-all ${
                      task.completion_approved ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleRequestCompletion(task.id)}
                        disabled={task.completion_requested || task.completion_approved}
                        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          task.completion_approved
                            ? 'bg-success border-success'
                            : task.completion_requested
                            ? 'bg-warning/20 border-warning'
                            : 'border-muted-foreground/30 hover:border-primary'
                        }`}
                      >
                        {task.completion_approved && (
                          <span className="text-success-foreground text-sm">✓</span>
                        )}
                        {task.completion_requested && !task.completion_approved && (
                          <span className="text-warning text-xs">⏳</span>
                        )}
                      </button>

                      <div className="flex-1">
                        <h3 className={`font-semibold text-base ${
                          task.completion_approved ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                            {task.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            +{task.points_awarded} pts
                          </span>
                          {task.completion_requested && !task.completion_approved && (
                            <span className="text-xs text-warning font-medium">
                              Waiting for approval
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                          task.priority === 'high' ? 'bg-destructive' :
                          task.priority === 'medium' ? 'bg-warning' : 'bg-success'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <div className={`lg:col-span-4 ${activeView === 'chat' ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-[90px] h-[calc(100vh-200px)] lg:h-[calc(100vh-120px)]">
              <ChatBot
                messages={messages}
                onSendMessage={handleSendMessage}
                isTyping={isTyping}
              />
            </div>
          </div>

          {/* Rewards Panel */}
          <div className={`lg:col-span-3 ${activeView === 'rewards' ? 'block' : 'hidden lg:block'}`}>
            <GamificationPanel stats={studentStats} />
          </div>
        </div>
      </main>
    </div>
  );
}
