import { useState, useCallback } from 'react';
import { Task, UserRole, ChatMessage } from '@/types/task';
import { TaskList } from '@/components/TaskList';
import { ChatBot } from '@/components/ChatBot';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { generateBotResponse, generateSampleTasks } from '@/lib/chat-helpers';
import { Sparkles, ListTodo, MessageCircle } from 'lucide-react';

const Index = () => {
  const [role, setRole] = useState<UserRole>('student');
  const [tasks, setTasks] = useState<Task[]>(generateSampleTasks());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeView, setActiveView] = useState<'tasks' | 'chat'>('tasks');

  const handleToggleComplete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  const handleSendMessage = useCallback(
    (content: string) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      // Simulate bot response with delay
      setTimeout(() => {
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: generateBotResponse(content, tasks),
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
        setIsTyping(false);
      }, 800 + Math.random() * 700);
    },
    [tasks]
  );

  const incompleteTasks = tasks.filter((t) => !t.completed).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Focus Flow</h1>
                <p className="text-xs text-muted-foreground">Stay on track, one task at a time</p>
              </div>
            </div>

            {/* Role Switcher */}
            <RoleSwitcher currentRole={role} onRoleChange={setRole} />
          </div>
        </div>
      </header>

      {/* Mobile View Toggle */}
      <div className="lg:hidden sticky top-[73px] z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2 p-1 bg-secondary rounded-full">
            <button
              onClick={() => setActiveView('tasks')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeView === 'tasks'
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              Tasks
              {incompleteTasks > 0 && (
                <span className="ml-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {incompleteTasks}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeView === 'chat'
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-5 lg:gap-6">
          {/* Tasks Panel */}
          <div
            className={`lg:col-span-3 ${
              activeView === 'tasks' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-xl">
                  {role === 'student'
                    ? 'My Tasks'
                    : role === 'parent'
                    ? "Your Child's Tasks"
                    : 'Student Tasks'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {incompleteTasks === 0
                    ? 'All done! Great job! 🎉'
                    : `${incompleteTasks} task${incompleteTasks !== 1 ? 's' : ''} to complete`}
                </p>
              </div>
            </div>
            <TaskList tasks={tasks} onToggleComplete={handleToggleComplete} />
          </div>

          {/* Chat Panel */}
          <div
            className={`lg:col-span-2 ${
              activeView === 'chat' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="lg:sticky lg:top-[90px] h-[calc(100vh-180px)] lg:h-[calc(100vh-120px)]">
              <ChatBot
                messages={messages}
                onSendMessage={handleSendMessage}
                isTyping={isTyping}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
