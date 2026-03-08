
-- Classes table
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own classes" ON public.classes
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create classes" ON public.classes
  FOR INSERT WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update own classes" ON public.classes
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own classes" ON public.classes
  FOR DELETE USING (auth.uid() = teacher_id);

-- Class students join table
CREATE TABLE public.class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view class students" ON public.class_students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid())
  );

CREATE POLICY "Teachers can add students to classes" ON public.class_students
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid())
  );

CREATE POLICY "Teachers can remove students from classes" ON public.class_students
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid())
  );

CREATE POLICY "Students can view own class memberships" ON public.class_students
  FOR SELECT USING (auth.uid() = student_id);

-- Invite codes table
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  teacher_id uuid NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  used_by uuid,
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own invite codes" ON public.invite_codes
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create invite codes" ON public.invite_codes
  FOR INSERT WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update own invite codes" ON public.invite_codes
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone authenticated can read invite codes by code" ON public.invite_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add optional class_id to tasks for class-wide assignments
ALTER TABLE public.tasks ADD COLUMN class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
