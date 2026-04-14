-- Allow teachers to UPDATE student_stats for students they are linked to.
-- Without this policy the "approve task → award points" flow silently fails
-- because RLS blocks the teacher's UPDATE on the student_stats row.

CREATE POLICY "Teachers can update linked student stats"
  ON public.student_stats
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.teacher_student_links
       WHERE teacher_student_links.teacher_id = auth.uid()
         AND teacher_student_links.student_id = student_stats.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.teacher_student_links
       WHERE teacher_student_links.teacher_id = auth.uid()
         AND teacher_student_links.student_id = student_stats.user_id
    )
  );
