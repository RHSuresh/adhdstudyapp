-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'parent', 'teacher');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Student gamification stats
CREATE TABLE public.student_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Parent-student relationship
CREATE TABLE public.parent_student_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- Teacher-student relationship
CREATE TABLE public.teacher_student_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, student_id)
);

-- Tasks table with approval workflow
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'homework',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completion_requested BOOLEAN NOT NULL DEFAULT false,
  completion_approved BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  points_awarded INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_required INTEGER NOT NULL DEFAULT 0
);

-- Student badges (earned badges)
CREATE TABLE public.student_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, points_required) VALUES
  ('First Steps', 'Complete your first task!', '🌟', 10),
  ('Task Master', 'Complete 10 tasks', '🏆', 100),
  ('Super Student', 'Complete 25 tasks', '🎓', 250),
  ('Homework Hero', 'Complete 50 tasks', '🦸', 500),
  ('Study Champion', 'Reach a 7-day streak', '🔥', 0),
  ('Focus Legend', 'Reach 1000 points', '👑', 1000);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profile policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers and parents can view linked student profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = user_id)
    OR EXISTS (SELECT 1 FROM public.teacher_student_links WHERE teacher_id = auth.uid() AND student_id = user_id)
  );

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Student stats policies
CREATE POLICY "Students can view own stats" ON public.student_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own stats" ON public.student_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own stats" ON public.student_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Parents and teachers can view linked student stats" ON public.student_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = user_id)
    OR EXISTS (SELECT 1 FROM public.teacher_student_links WHERE teacher_id = auth.uid() AND student_id = user_id)
  );

-- Tasks policies
CREATE POLICY "Students can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view assigned tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = assigned_by OR EXISTS (
    SELECT 1 FROM public.teacher_student_links WHERE teacher_id = auth.uid() AND student_id = tasks.student_id
  ));

CREATE POLICY "Teachers can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update tasks they assigned" ON public.tasks
  FOR UPDATE USING (auth.uid() = assigned_by);

CREATE POLICY "Parents can view their children tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = tasks.student_id)
  );

-- Parent-student links policies
CREATE POLICY "Parents can view own links" ON public.parent_student_links
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Students can view who their parents are" ON public.parent_student_links
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Parents can create links" ON public.parent_student_links
  FOR INSERT WITH CHECK (auth.uid() = parent_id AND public.has_role(auth.uid(), 'parent'));

-- Teacher-student links policies
CREATE POLICY "Teachers can view own links" ON public.teacher_student_links
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view who their teachers are" ON public.teacher_student_links
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can create links" ON public.teacher_student_links
  FOR INSERT WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

-- Badges policies (public read)
CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT USING (true);

-- Student badges policies
CREATE POLICY "Users can view own badges" ON public.student_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges" ON public.student_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents and teachers can view linked student badges" ON public.student_badges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = user_id)
    OR EXISTS (SELECT 1 FROM public.teacher_student_links WHERE teacher_id = auth.uid() AND student_id = user_id)
  );

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_stats_updated_at
  BEFORE UPDATE ON public.student_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();