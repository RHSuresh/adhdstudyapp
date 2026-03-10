-- Add max_uses to invite_codes (null = unlimited)
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT NULL;

-- Create invite_code_uses table to track each redemption
CREATE TABLE public.invite_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: a student can only be enrolled once per code
ALTER TABLE public.invite_code_uses ADD CONSTRAINT unique_code_student UNIQUE (code_id, student_id);

-- Enable RLS
ALTER TABLE public.invite_code_uses ENABLE ROW LEVEL SECURITY;

-- Parents can view their own uses
CREATE POLICY "Parents can view own code uses"
ON public.invite_code_uses FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- Teachers can view uses of their codes
CREATE POLICY "Teachers can view uses of their codes"
ON public.invite_code_uses FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.invite_codes
  WHERE invite_codes.id = invite_code_uses.code_id
  AND invite_codes.teacher_id = auth.uid()
));

-- Authenticated users can insert code uses
CREATE POLICY "Authenticated users can insert code uses"
ON public.invite_code_uses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = parent_id);

-- Allow students to view classes they belong to
CREATE POLICY "Students can view classes they belong to"
ON public.classes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.class_students
  WHERE class_students.class_id = classes.id
  AND class_students.student_id = auth.uid()
));