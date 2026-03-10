import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { Users, LogOut, CheckCircle, Clock, Trophy, Flame, Calendar, Plus, Ticket } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Child {
  id: string;
  full_name: string;
}

interface ChildStats {
  points: number;
  streak_days: number;
  tasks_completed: number;
}

interface Task {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  completion_requested: boolean;
  completion_approved: boolean;
  due_date: string | null;
  completed_at: string | null;
  approved_at: string | null;
}

export default function ParentDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [childStats, setChildStats] = useState<ChildStats | null>(null);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinStudentId, setJoinStudentId] = useState('');
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [addingLoading, setAddingLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({ fullName: '', email: '', password: '' });

  const handleAddStudent = async () => {
    if (!newStudent.fullName || !newStudent.email || !newStudent.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newStudent.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setAddingLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-student', {
        body: {
          fullName: newStudent.fullName,
          email: newStudent.email,
          password: newStudent.password,
        },
      });

      if (res.error) {
        toast.error(res.error.message || 'Failed to create student');
      } else if (res.data?.error) {
        if (res.data.error.includes('already been registered')) {
          toast.info('This email is already registered. The student may already have an account.');
        } else {
          toast.error(res.data.error);
        }
      } else {
        toast.success(`Student account created for ${newStudent.fullName}!`);
        setIsAddingStudent(false);
        setNewStudent({ fullName: '', email: '', password: '' });
        fetchChildren();
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
    setAddingLoading(false);
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    if (!joinStudentId) {
      toast.error('Please select a child to enroll');
      return;
    }

    setJoiningLoading(true);
    try {
      const res = await supabase.functions.invoke('enroll-student-in-class', {
        body: { code: joinCode.trim(), studentId: joinStudentId },
      });

      if (res.error) {
        toast.error(res.error.message || 'Failed to enroll');
      } else if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(res.data.message || 'Student enrolled successfully!');
        setIsJoiningClass(false);
        setJoinCode('');
        setJoinStudentId('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
    setJoiningLoading(false);
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth/parent');
      return;
    }
    fetchChildren();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    if (!user) return;

    const { data: links } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user.id);

    if (links && links.length > 0) {
      const childIds = links.map(l => l.student_id);
      const { data: childProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', childIds);

      if (childProfiles) {
        const childrenData = childProfiles.map(p => ({ id: p.user_id, full_name: p.full_name }));
        setChildren(childrenData);
        if (childrenData.length > 0) {
          setSelectedChild(childrenData[0].id);
        }
      }
    }
    setLoading(false);
  };

  const fetchChildData = async (childId: string) => {
    // Fetch stats
    const { data: stats } = await supabase
      .from('student_stats')
      .select('*')
      .eq('user_id', childId)
      .maybeSingle();

    if (stats) {
      setChildStats({
        points: stats.points,
        streak_days: stats.streak_days,
        tasks_completed: stats.tasks_completed,
      });
    }

    // Fetch tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', childId)
      .order('created_at', { ascending: false });

    if (tasks) {
      setChildTasks(tasks);
    }
  };

  const selectedChildProfile = children.find(c => c.id === selectedChild);
  const completedThisWeek = childTasks.filter(t => {
    if (!t.approved_at) return false;
    const approvedDate = new Date(t.approved_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return approvedDate > weekAgo;
  }).length;

  const pendingTasks = childTasks.filter(t => !t.completion_approved);
  const completedTasks = childTasks.filter(t => t.completion_approved);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-success mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
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
              <div className="w-10 h-10 bg-success rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Parent Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  Welcome, {profile?.full_name || 'Parent'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button variant="outline" className="gap-2" onClick={() => setIsJoiningClass(true)}>
                <Ticket className="w-4 h-4" />
                Join Class
              </Button>

              <Dialog open={isAddingStudent} onOpenChange={setIsAddingStudent}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add a Student</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={newStudent.fullName}
                        onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                        placeholder="e.g., Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newStudent.email}
                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                        placeholder="student@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={newStudent.password}
                        onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <Button onClick={handleAddStudent} className="w-full" disabled={addingLoading}>
                      {addingLoading ? 'Creating...' : 'Create Student Account'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <RoleSwitcher />
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {children.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 shadow-soft border border-border/50 text-center">
            <Users className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="font-bold text-xl mb-2">No Students Yet</h2>
            <p className="text-muted-foreground mb-4">
              Click "Add Student" to create a student account and start tracking their progress.
            </p>
          </div>
        ) : (
          <>
            {/* Child Selector */}
            {children.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      selectedChild === child.id
                        ? 'bg-success text-success-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {child.full_name}
                  </button>
                ))}
              </div>
            )}

            {/* Child Overview */}
            <div className="mb-6">
              <h2 className="font-bold text-xl mb-4">
                {selectedChildProfile?.full_name}'s Progress
              </h2>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{childStats?.points || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Points</div>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                      <Flame className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{childStats?.streak_days || 0}</div>
                      <div className="text-xs text-muted-foreground">Day Streak</div>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{childStats?.tasks_completed || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Completed</div>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{completedThisWeek}</div>
                      <div className="text-xs text-muted-foreground">This Week</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Summary */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pending Tasks */}
                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    Pending Tasks ({pendingTasks.length})
                  </h3>
                  {pendingTasks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No pending tasks! 🎉</p>
                  ) : (
                    <div className="space-y-2">
                      {pendingTasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
                        >
                          <div>
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {task.category}
                              {task.completion_requested && ' • Awaiting approval'}
                            </div>
                          </div>
                          {task.completion_requested && (
                            <span className="text-xs text-warning font-medium">⏳</span>
                          )}
                        </div>
                      ))}
                      {pendingTasks.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{pendingTasks.length - 5} more
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Recently Completed */}
                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Recently Completed
                  </h3>
                  {completedTasks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No completed tasks yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {completedTasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-success/5 rounded-xl"
                        >
                          <div>
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {task.category}
                            </div>
                          </div>
                          <span className="text-success">✓</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Encouragement */}
              {childStats && (
                <div className="mt-6 bg-gradient-to-br from-success/10 to-accent rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-3">
                    {(childStats.streak_days || 0) >= 7 ? '🌟' : (childStats.streak_days || 0) >= 3 ? '⭐' : '✨'}
                  </div>
                  <p className="font-medium">
                    {(childStats.tasks_completed || 0) === 0
                      ? `${selectedChildProfile?.full_name} is just getting started!`
                      : (childStats.streak_days || 0) >= 7
                      ? `${selectedChildProfile?.full_name} is on fire with a ${childStats.streak_days}-day streak!`
                      : `${selectedChildProfile?.full_name} has completed ${childStats.tasks_completed} tasks!`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Join Class Dialog */}
        <Dialog open={isJoiningClass} onOpenChange={setIsJoiningClass}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Join a Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the invite code from your child's teacher to enroll them in a class.
              </p>
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC123"
                  className="font-mono tracking-wider"
                />
              </div>
              <div className="space-y-2">
                <Label>Select Child</Label>
                <Select value={joinStudentId} onValueChange={setJoinStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleJoinClass} className="w-full" disabled={joiningLoading || children.length === 0}>
                {joiningLoading ? 'Enrolling...' : 'Enroll in Class'}
              </Button>
              {children.length === 0 && (
                <p className="text-xs text-destructive text-center">
                  Add a student first before joining a class.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
