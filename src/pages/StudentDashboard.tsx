import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskList } from '@/components/TaskList';
import { ChatBot } from '@/components/ChatBot';
import { DancingOwl } from '@/components/DancingOwl';
import { GamificationPanel } from '@/components/GamificationPanel';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { Sparkles, LogOut, MessageCircle, ListTodo, Trophy, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/types/task';

interface TimerAction {
  type: 'set_timer' | 'timer_start' | 'timer_pause' | 'timer_reset';
  focusMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
}

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

interface StudentClass {
  id: string;
  name: string;
}

export default function StudentDashboard() {
  const { user, profile, studentStats, signOut, refreshStats } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeView, setActiveView] = useState<'tasks' | 'chat' | 'rewards' | 'timer'>('tasks');
  const [loading, setLoading] = useState(true);
  const [timerActions, setTimerActions] = useState<TimerAction[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/student');
      return;
    }
    fetchTasks();
    fetchClasses();
  }, [user, navigate]);

  const fetchClasses = async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', user.id);

    if (memberships && memberships.length > 0) {
      const classIds = memberships.map(m => m.class_id);
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      if (classesData) {
        setStudentClasses(classesData);
      }
    }
  };

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

  const handleCreateTask = async (title: string, dueDate?: string) => {
    if (!user) return;

    let parsedDueDate = null;
    if (dueDate) {
      try {
        // Parse various date formats, e.g. "10/31/2077" -> Date
        const date = new Date(dueDate);
        if (!isNaN(date.getTime())) {
          parsedDueDate = date.toISOString();
        }
      } catch (e) {
        console.error('Invalid due date:', dueDate);
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        student_id: user.id,
        assigned_by: user.id,
        title,
        description: null,
        category: 'General',
        priority: 'medium',
        due_date: parsedDueDate,
        completed: false,
        completion_requested: false,
        completion_approved: false,
        points_awarded: 10, // default points
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
    } else {
      // Refetch tasks to include the new one
      fetchTasks();
    }
  };

  const handleCompleteTask = async (title: string) => {
    if (!user) return;

    // Find the task by title (assuming titles are unique for simplicity)
    const task = tasks.find(t => t.title.toLowerCase() === title.toLowerCase());
    if (!task) {
      console.error('Task not found:', title);
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', task.id);

    if (error) {
      console.error('Error completing task:', error);
    } else {
      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, completed: true } : t
      ));
    }
  };

  // endpoint can be configured via VITE_CHAT_API_URL, defaults to local flask server
  const CHAT_API_URL =
    import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5001/api/chat';

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Build history from existing messages for context
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      // post to whichever backend is running (supabase functions or flask)
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history }),
        // omit credentials; CORS allowed on flask server
      });

      const data = await response.json();

      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data?.reply || data?.error || "Sorry, something went wrong!",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);

      // Handle actions from chatbot
      if (data?.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          if (action.type === 'create_task' && action.title) {
            await handleCreateTask(action.title, action.due_date);
          } else if (action.type === 'complete_task' && action.title) {
            await handleCompleteTask(action.title);
          }
        }
        const timerActions = data.actions.filter(a => 
          ['set_timer', 'timer_start', 'timer_pause', 'timer_reset'].includes(a.type)
        );
        if (timerActions.length > 0) {
          setTimerActions(timerActions);
          setActiveView('timer');
        }
        if (data.actions.some(a => a.type === 'create_task' || a.type === 'complete_task')) {
          setActiveView('tasks');
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Oops! I couldn't connect right now. Try again in a moment! 🔄",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
    }
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
                {studentClasses.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {studentClasses.map(c => (
                      <span key={c.id} className="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full">
                        📚 {c.name}
                      </span>
                    ))}
                  </div>
                )}
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
              { id: 'timer', icon: Timer, label: 'Timer' },
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

          {/* Timer Panel */}
          <div className={`lg:col-span-3 ${activeView === 'timer' ? 'block' : 'hidden lg:block'} order-first lg:order-none`}>
            <div className="space-y-6">
              <PomodoroTimer externalActions={timerActions} onActionsProcessed={() => setTimerActions([])} />
              <div className={`${activeView === 'rewards' ? 'block' : 'hidden lg:block'}`}>
                <GamificationPanel stats={studentStats} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
