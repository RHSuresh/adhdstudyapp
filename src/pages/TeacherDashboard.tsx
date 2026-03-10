import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { School, LogOut, Plus, CheckCircle, Clock, Users, XCircle, Copy, BookOpen, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { RoleSwitcher } from '@/components/RoleSwitcher';

interface Student {
  id: string;
  full_name: string;
  email?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  student_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  completed: boolean;
  completion_requested: boolean;
  completion_approved: boolean;
  points_awarded: number;
  created_at: string;
  class_id: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  created_at: string;
}

interface ClassRoster {
  [classId: string]: { id: string; full_name: string }[];
}

interface InviteCode {
  id: string;
  code: string;
  class_id: string | null;
  used_by: string | null;
  expires_at: string;
  created_at: string;
  max_uses: number | null;
}

export default function TeacherDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isLinkingStudent, setIsLinkingStudent] = useState(false);
  const [isManagingClasses, setIsManagingClasses] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [selectedClassForCode, setSelectedClassForCode] = useState<string>('');

  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    student_id: '',
    class_id: '',
    category: 'homework',
    priority: 'medium',
    due_date: '',
    points_awarded: 10,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth/teacher');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch linked students
    const { data: links } = await supabase
      .from('teacher_student_links')
      .select('student_id')
      .eq('teacher_id', user.id);

    if (links && links.length > 0) {
      const studentIds = links.map(l => l.student_id);
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      if (studentProfiles) {
        setStudents(studentProfiles.map(p => ({ id: p.user_id, full_name: p.full_name })));
      }
    }

    // Fetch tasks assigned by this teacher
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_by', user.id)
      .order('created_at', { ascending: false });

    if (tasksData) {
      setTasks(tasksData as Task[]);
    }

    // Fetch classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (classesData) {
      setClasses(classesData);
    }

    // Fetch invite codes
    const { data: codesData } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (codesData) {
      setInviteCodes(codesData as InviteCode[]);
    }

    setLoading(false);
  };

  const handleLinkStudent = async () => {
    if (!studentEmail.trim() || !user) return;

    try {
      const res = await supabase.functions.invoke('link-student', {
        body: { email: studentEmail.trim() },
      });

      if (res.error) {
        toast.error(res.error.message || 'Failed to link student');
      } else if (res.data?.error) {
        if (res.data.error === 'Student is already linked to you') {
          toast.info('This student is already linked to your account.');
        } else {
          toast.error(res.data.error);
        }
      } else {
        toast.success(res.data.message || 'Student linked!');
        setStudentEmail('');
        fetchData();
      }
      setIsLinkingStudent(false);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !user) return;

    const { error } = await supabase
      .from('classes')
      .insert({
        name: newClassName.trim(),
        teacher_id: user.id,
      });

    if (error) {
      toast.error('Failed to create class');
    } else {
      toast.success(`Class "${newClassName}" created!`);
      setNewClassName('');
      fetchData();
    }
  };

  const handleGenerateInviteCode = async () => {
    if (!user) return;

    try {
      const res = await supabase.functions.invoke('generate-invite-code', {
        body: {
          classId: selectedClassForCode || null,
          expiresInDays: 7,
        },
      });

      if (res.error) {
        toast.error(res.error.message || 'Failed to generate code');
      } else if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(`Invite code generated: ${res.data.code}`);
        setIsGeneratingCode(false);
        setSelectedClassForCode('');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    // If assigning to a class, create tasks for all students in that class
    if (newTask.class_id && !newTask.student_id) {
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', newTask.class_id);

      if (!classStudents || classStudents.length === 0) {
        toast.error('No students in this class yet');
        return;
      }

      const tasksToInsert = classStudents.map(cs => ({
        title: newTask.title,
        description: newTask.description || null,
        student_id: cs.student_id,
        assigned_by: user.id,
        class_id: newTask.class_id,
        category: newTask.category,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        points_awarded: newTask.points_awarded,
      }));

      const { error } = await supabase.from('tasks').insert(tasksToInsert);

      if (error) {
        toast.error('Failed to assign tasks');
      } else {
        toast.success(`Task assigned to ${classStudents.length} students!`);
        resetTaskForm();
        fetchData();
      }
    } else if (newTask.student_id) {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description || null,
          student_id: newTask.student_id,
          assigned_by: user.id,
          class_id: newTask.class_id || null,
          category: newTask.category,
          priority: newTask.priority,
          due_date: newTask.due_date || null,
          points_awarded: newTask.points_awarded,
        });

      if (error) {
        toast.error('Failed to create task');
      } else {
        toast.success('Task assigned successfully!');
        resetTaskForm();
        fetchData();
      }
    } else {
      toast.error('Please select a student or a class');
    }
  };

  const resetTaskForm = () => {
    setIsAddingTask(false);
    setNewTask({
      title: '',
      description: '',
      student_id: '',
      class_id: '',
      category: 'homework',
      priority: 'medium',
      due_date: '',
      points_awarded: 10,
    });
  };

  const handleApproveTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        completion_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to approve task');
    } else {
      toast.success('Task approved! Points awarded to student.');

      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('user_id', task.student_id)
        .maybeSingle();

      if (stats) {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = stats.last_completed_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        let newStreak = stats.streak_days;
        if (lastDate === yesterday) {
          newStreak += 1;
        } else if (lastDate !== today) {
          newStreak = 1;
        }

        await supabase
          .from('student_stats')
          .update({
            points: stats.points + task.points_awarded,
            tasks_completed: stats.tasks_completed + 1,
            streak_days: newStreak,
            last_completed_date: today,
          })
          .eq('user_id', task.student_id);
      }

      fetchData();
    }
  };

  const handleRejectTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        completion_requested: false,
        completed_at: null,
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to reject task');
    } else {
      toast.info('Task sent back to student');
      fetchData();
    }
  };

  const pendingApproval = tasks.filter(t => t.completion_requested && !t.completion_approved);
  const completedTasks = tasks.filter(t => t.completion_approved);
  const activeTasks = tasks.filter(t => !t.completion_requested && !t.completion_approved);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <School className="w-12 h-12 text-warning mx-auto animate-pulse" />
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
              <div className="w-10 h-10 bg-warning rounded-xl flex items-center justify-center">
                <School className="w-5 h-5 text-warning-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Teacher Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  Welcome, {profile?.full_name || 'Teacher'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsManagingClasses(true)}>
                <BookOpen className="w-4 h-4" />
                Classes
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsGeneratingCode(true)}>
                <Ticket className="w-4 h-4" />
                Invite Code
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsLinkingStudent(true)}>
                <Users className="w-4 h-4" />
                Link Student
              </Button>
              <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="w-4 h-4" />
                    Assign Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Assign New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assign to</Label>
                      <Select
                        value={newTask.class_id ? `class:${newTask.class_id}` : newTask.student_id ? `student:${newTask.student_id}` : ''}
                        onValueChange={(v) => {
                          if (v.startsWith('class:')) {
                            setNewTask({ ...newTask, class_id: v.replace('class:', ''), student_id: '' });
                          } else if (v.startsWith('student:')) {
                            setNewTask({ ...newTask, student_id: v.replace('student:', ''), class_id: '' });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student or class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.length > 0 && (
                            <>
                              <SelectItem value="__class_header" disabled>— Classes —</SelectItem>
                              {classes.map((c) => (
                                <SelectItem key={`class:${c.id}`} value={`class:${c.id}`}>
                                  📚 {c.name} (entire class)
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {students.length > 0 && (
                            <>
                              <SelectItem value="__student_header" disabled>— Students —</SelectItem>
                              {students.map((s) => (
                                <SelectItem key={`student:${s.id}`} value={`student:${s.id}`}>
                                  👤 {s.full_name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Task Title</Label>
                      <Input
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="e.g., Read Chapter 5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Additional details..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={newTask.category}
                          onValueChange={(v) => setNewTask({ ...newTask, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="homework">Homework</SelectItem>
                            <SelectItem value="reading">Reading</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={newTask.due_date}
                          onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={newTask.points_awarded}
                          onChange={(e) => setNewTask({ ...newTask, points_awarded: parseInt(e.target.value) || 10 })}
                          min={1}
                          max={100}
                        />
                      </div>
                    </div>

                    <Button onClick={handleCreateTask} className="w-full">
                      Assign Task
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

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{students.length}</div>
                <div className="text-xs text-muted-foreground">Students</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingApproval.length}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{activeTasks.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedTasks.length}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Classes & Invite Codes Summary */}
        {(classes.length > 0 || inviteCodes.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {classes.length > 0 && (
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Your Classes
                </h3>
                <div className="space-y-2">
                  {classes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm bg-secondary/50 rounded-xl px-3 py-2">
                      <span className="font-medium">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inviteCodes.length > 0 && (
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  Active Invite Codes
                </h3>
                <div className="space-y-2">
                  {inviteCodes
                    .filter(c => !c.used_by && new Date(c.expires_at) > new Date())
                    .slice(0, 5)
                    .map((ic) => {
                      const cls = classes.find(c => c.id === ic.class_id);
                      return (
                        <div key={ic.id} className="flex items-center justify-between text-sm bg-secondary/50 rounded-xl px-3 py-2">
                          <div>
                            <span className="font-mono font-bold tracking-wider">{ic.code}</span>
                            {cls && <span className="text-xs text-muted-foreground ml-2">({cls.name})</span>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyCode(ic.code)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Approval Section */}
        {pendingApproval.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Awaiting Your Approval ({pendingApproval.length})
            </h2>
            <div className="space-y-3">
              {pendingApproval.map((task) => {
                const student = students.find(s => s.id === task.student_id);
                return (
                  <div
                    key={task.id}
                    className="bg-card rounded-2xl p-4 shadow-soft border-2 border-warning/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                            {student?.full_name || 'Unknown Student'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            +{task.points_awarded} pts
                          </span>
                        </div>
                        <h3 className="font-semibold">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectTask(task.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveTask(task.id)}
                          className="gap-1 bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Tasks */}
        <div className="mb-6">
          <h2 className="font-bold text-xl mb-4">Active Tasks ({activeTasks.length})</h2>
          {activeTasks.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-soft border border-border/50 text-center">
              <p className="text-muted-foreground">No active tasks. Assign one to get started!</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {activeTasks.map((task) => {
                const student = students.find(s => s.id === task.student_id);
                return (
                  <div
                    key={task.id}
                    className="bg-card rounded-2xl p-4 shadow-soft border border-border/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {student?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{task.category}</span>
                    </div>
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* No students message */}
        {students.length === 0 && (
          <div className="bg-accent/50 rounded-2xl p-6 text-center">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Students Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create a class, generate an invite code, and share it with parents to get started.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setIsManagingClasses(true)} className="gap-2">
                <BookOpen className="w-4 h-4" />
                Create Class
              </Button>
              <Button onClick={() => setIsGeneratingCode(true)} className="gap-2">
                <Ticket className="w-4 h-4" />
                Generate Invite Code
              </Button>
            </div>
          </div>
        )}

        {/* Link Student Dialog */}
        <Dialog open={isLinkingStudent} onOpenChange={setIsLinkingStudent}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Link a Student (Manual)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Student Email</Label>
                <Input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Fallback: link a student directly by email. Prefer using invite codes instead.
                </p>
              </div>
              <Button onClick={handleLinkStudent} className="w-full">
                Link Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Classes Dialog */}
        <Dialog open={isManagingClasses} onOpenChange={setIsManagingClasses}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Classes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g., Math Period 3"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
                />
                <Button onClick={handleCreateClass} disabled={!newClassName.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {classes.length > 0 ? (
                <div className="space-y-2">
                  {classes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
                      <span className="font-medium text-sm">{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No classes yet. Create one above.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Generate Invite Code Dialog */}
        <Dialog open={isGeneratingCode} onOpenChange={setIsGeneratingCode}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Invite Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a code to share with parents. When they sign up using this code, their children will be automatically linked to you.
              </p>
              <div className="space-y-2">
                <Label>Class (optional)</Label>
                <Select
                  value={selectedClassForCode}
                  onValueChange={setSelectedClassForCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No specific class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific class</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerateInviteCode} className="w-full">
                Generate Code
              </Button>

              {/* Show existing active codes */}
              {inviteCodes.filter(c => !c.used_by && new Date(c.expires_at) > new Date()).length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Active codes:</p>
                  <div className="space-y-1">
                    {inviteCodes
                      .filter(c => !c.used_by && new Date(c.expires_at) > new Date())
                      .map(ic => {
                        const cls = classes.find(c => c.id === ic.class_id);
                        return (
                          <div key={ic.id} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-mono font-bold">{ic.code}</span>
                              {cls && <span className="text-xs text-muted-foreground ml-1">({cls.name})</span>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => copyCode(ic.code)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
