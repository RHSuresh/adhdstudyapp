
-- Fix ALL RLS policies: they were created as RESTRICTIVE (which requires ALL to pass).
-- PostgreSQL needs at least one PERMISSIVE policy. Recreate them as PERMISSIVE.

-- ============ classes ============
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view classes they belong to" ON public.classes;

CREATE POLICY "Teachers can view own classes" ON public.classes FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can update own classes" ON public.classes FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own classes" ON public.classes FOR DELETE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view classes they belong to" ON public.classes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM class_students WHERE class_students.class_id = classes.id AND class_students.student_id = auth.uid()));

-- ============ invite_codes ============
DROP POLICY IF EXISTS "Anyone authenticated can read invite codes by code" ON public.invite_codes;
DROP POLICY IF EXISTS "Anyone can redeem unused invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Teachers can create invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Teachers can update own invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Teachers can view own invite codes" ON public.invite_codes;

CREATE POLICY "Anyone authenticated can read invite codes by code" ON public.invite_codes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can redeem unused invite codes" ON public.invite_codes FOR UPDATE TO authenticated USING (used_by IS NULL) WITH CHECK (used_by = auth.uid());
CREATE POLICY "Teachers can create invite codes" ON public.invite_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can update own invite codes" ON public.invite_codes FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can view own invite codes" ON public.invite_codes FOR SELECT TO authenticated USING (auth.uid() = teacher_id);

-- ============ user_roles ============
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ profiles ============
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers and parents can view linked student profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Teachers and parents can view linked student profiles" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM parent_student_links WHERE parent_student_links.parent_id = auth.uid() AND parent_student_links.student_id = profiles.user_id)
  OR EXISTS (SELECT 1 FROM teacher_student_links WHERE teacher_student_links.teacher_id = auth.uid() AND teacher_student_links.student_id = profiles.user_id)
);

-- ============ teacher_student_links ============
DROP POLICY IF EXISTS "Teachers can view own links" ON public.teacher_student_links;
DROP POLICY IF EXISTS "Teachers can create links" ON public.teacher_student_links;
DROP POLICY IF EXISTS "Students can view who their teachers are" ON public.teacher_student_links;

CREATE POLICY "Teachers can view own links" ON public.teacher_student_links FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can create links" ON public.teacher_student_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students can view who their teachers are" ON public.teacher_student_links FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- ============ parent_student_links ============
DROP POLICY IF EXISTS "Parents can view own links" ON public.parent_student_links;
DROP POLICY IF EXISTS "Parents can create links" ON public.parent_student_links;
DROP POLICY IF EXISTS "Students can view who their parents are" ON public.parent_student_links;

CREATE POLICY "Parents can view own links" ON public.parent_student_links FOR SELECT TO authenticated USING (auth.uid() = parent_id);
CREATE POLICY "Parents can create links" ON public.parent_student_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = parent_id AND has_role(auth.uid(), 'parent'));
CREATE POLICY "Students can view who their parents are" ON public.parent_student_links FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- ============ tasks ============
DROP POLICY IF EXISTS "Students can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Students can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Teachers can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Teachers can update tasks they assigned" ON public.tasks;
DROP POLICY IF EXISTS "Teachers can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Parents can view their children tasks" ON public.tasks;

CREATE POLICY "Students can view own tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Students can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Teachers can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can update tasks they assigned" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = assigned_by);
CREATE POLICY "Teachers can view assigned tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = assigned_by OR EXISTS (SELECT 1 FROM teacher_student_links WHERE teacher_student_links.teacher_id = auth.uid() AND teacher_student_links.student_id = tasks.student_id));
CREATE POLICY "Parents can view their children tasks" ON public.tasks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM parent_student_links WHERE parent_student_links.parent_id = auth.uid() AND parent_student_links.student_id = tasks.student_id));

-- ============ student_stats ============
DROP POLICY IF EXISTS "Students can view own stats" ON public.student_stats;
DROP POLICY IF EXISTS "Students can insert own stats" ON public.student_stats;
DROP POLICY IF EXISTS "Students can update own stats" ON public.student_stats;
DROP POLICY IF EXISTS "Parents and teachers can view linked student stats" ON public.student_stats;

CREATE POLICY "Students can view own stats" ON public.student_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own stats" ON public.student_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update own stats" ON public.student_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Parents and teachers can view linked student stats" ON public.student_stats FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM parent_student_links WHERE parent_student_links.parent_id = auth.uid() AND parent_student_links.student_id = student_stats.user_id)
  OR EXISTS (SELECT 1 FROM teacher_student_links WHERE teacher_student_links.teacher_id = auth.uid() AND teacher_student_links.student_id = student_stats.user_id)
);

-- ============ class_students ============
DROP POLICY IF EXISTS "Students can view own class memberships" ON public.class_students;
DROP POLICY IF EXISTS "Teachers can add students to classes" ON public.class_students;
DROP POLICY IF EXISTS "Teachers can remove students from classes" ON public.class_students;
DROP POLICY IF EXISTS "Teachers can view class students" ON public.class_students;

CREATE POLICY "Students can view own class memberships" ON public.class_students FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Teachers can add students to classes" ON public.class_students FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Teachers can remove students from classes" ON public.class_students FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Teachers can view class students" ON public.class_students FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid()));

-- ============ invite_code_uses ============
DROP POLICY IF EXISTS "Authenticated users can insert code uses" ON public.invite_code_uses;
DROP POLICY IF EXISTS "Parents can view own code uses" ON public.invite_code_uses;
DROP POLICY IF EXISTS "Teachers can view uses of their codes" ON public.invite_code_uses;

CREATE POLICY "Authenticated users can insert code uses" ON public.invite_code_uses FOR INSERT TO authenticated WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can view own code uses" ON public.invite_code_uses FOR SELECT TO authenticated USING (auth.uid() = parent_id);
CREATE POLICY "Teachers can view uses of their codes" ON public.invite_code_uses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM invite_codes WHERE invite_codes.id = invite_code_uses.code_id AND invite_codes.teacher_id = auth.uid()));

-- ============ badges ============
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT TO authenticated USING (true);

-- ============ student_badges ============
DROP POLICY IF EXISTS "Users can view own badges" ON public.student_badges;
DROP POLICY IF EXISTS "System can insert badges" ON public.student_badges;
DROP POLICY IF EXISTS "Parents and teachers can view linked student badges" ON public.student_badges;

CREATE POLICY "Users can view own badges" ON public.student_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert badges" ON public.student_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Parents and teachers can view linked student badges" ON public.student_badges FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM parent_student_links WHERE parent_student_links.parent_id = auth.uid() AND parent_student_links.student_id = student_badges.user_id)
  OR EXISTS (SELECT 1 FROM teacher_student_links WHERE teacher_student_links.teacher_id = auth.uid() AND teacher_student_links.student_id = student_badges.user_id)
);
