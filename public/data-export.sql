-- ============================================
-- DATA EXPORT FROM LOVABLE CLOUD
-- ============================================
-- INSTRUCTIONS:
-- 1. You should have already run the migrations SQL to create all tables,
--    enums, functions, and RLS policies.
-- 2. Create auth users in your Supabase project
--    (Dashboard → Authentication → Users → Add User) for each email below.
-- 3. Replace the UUIDs below with the new user IDs from your Supabase project.
-- 4. Run this entire file in the SQL Editor. It is SAFE to re-run —
--    all statements use ON CONFLICT DO NOTHING so nothing will break.
--
-- User 1 (SUPER ADMIN / DEV): rosuresh2@gmail.com
--   → Replace UUID: b1a0ea5f-94fc-465c-8772-08e2ba156cd0
--   → Roles: student, parent, teacher (all three for dev purposes)
--
-- User 2 (STUDENT ONLY): livathlete@gmail.com
--   → Replace UUID: 3dfc5617-774d-48e4-a646-78236528b87a
--   → Role: student ONLY
-- ============================================

-- PROFILES
INSERT INTO public.profiles (id, user_id, full_name, avatar_url, created_at, updated_at) VALUES
  ('e785915d-0562-476f-b3a1-b25f71c25ccb', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'RHS', NULL, '2026-02-07 18:23:48.086767+00', '2026-02-07 18:23:48.086767+00'),
  ('d30b8d5f-abdf-47d0-960b-cd13cd91ea31', '3dfc5617-774d-48e4-a646-78236528b87a', 'Test Student', NULL, '2026-02-19 14:14:12.861151+00', '2026-02-19 14:14:12.861151+00')
ON CONFLICT DO NOTHING;

-- USER ROLES
-- rosuresh2 = super admin (all 3 roles for dev)
-- livathlete = student ONLY
INSERT INTO public.user_roles (id, user_id, role) VALUES
  ('df480aa6-6974-400a-8731-5c23639e549c', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'student'),
  ('e895a468-4d29-45fb-bbb9-388bd67b06d5', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'parent'),
  ('abd789ad-eb65-407b-8e1f-bdca80804d73', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'teacher'),
  ('f0ebbc10-65ef-4e99-a402-2942a4f7a517', '3dfc5617-774d-48e4-a646-78236528b87a', 'student')
ON CONFLICT DO NOTHING;

-- STUDENT STATS
INSERT INTO public.student_stats (id, user_id, points, streak_days, tasks_completed, last_completed_date, created_at, updated_at) VALUES
  ('8cb563d7-a621-44ad-8c6d-e72714260185', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 0, 0, 0, NULL, '2026-02-07 18:23:48.409329+00', '2026-02-07 18:23:48.409329+00'),
  ('e41520eb-ff6d-42d3-b407-e4ca0a2f9bcf', '3dfc5617-774d-48e4-a646-78236528b87a', 0, 0, 0, NULL, '2026-02-19 14:14:13.249243+00', '2026-02-19 14:14:13.249243+00')
ON CONFLICT DO NOTHING;

-- BADGES
INSERT INTO public.badges (id, name, description, icon, points_required) VALUES
  ('49673539-21f5-43bf-85a3-10b622c8d91e', 'First Steps', 'Complete your first task!', '🌟', 10),
  ('e630cc1d-058d-40c8-973c-4f201ecece31', 'Task Master', 'Complete 10 tasks', '🏆', 100),
  ('7417246c-b7a2-4f81-b932-20dde2c893c0', 'Super Student', 'Complete 25 tasks', '🎓', 250),
  ('6c76697d-b570-4016-9ae6-24029b8c4e52', 'Homework Hero', 'Complete 50 tasks', '🦸', 500),
  ('1d81fae7-70d1-4f63-8e86-23758bc2e4f1', 'Study Champion', 'Reach a 7-day streak', '🔥', 0),
  ('86881dc3-1bec-4f9b-b834-ee13aee59449', 'Focus Legend', 'Reach 1000 points', '👑', 1000)
ON CONFLICT DO NOTHING;

-- PARENT-STUDENT LINKS
INSERT INTO public.parent_student_links (id, parent_id, student_id, created_at) VALUES
  ('d91a543d-1268-47ba-97f9-742164a44d4f', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', '3dfc5617-774d-48e4-a646-78236528b87a', '2026-02-19 14:14:13.517017+00')
ON CONFLICT DO NOTHING;

-- TEACHER-STUDENT LINKS
INSERT INTO public.teacher_student_links (id, teacher_id, student_id, created_at) VALUES
  ('76a1b260-0bef-4022-8a22-6d9fef2c3053', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', '3dfc5617-774d-48e4-a646-78236528b87a', '2026-02-19 14:14:13.893427+00')
ON CONFLICT DO NOTHING;

-- TASKS
INSERT INTO public.tasks (id, student_id, assigned_by, title, description, category, priority, due_date, completed, completion_requested, completion_approved, completed_at, approved_at, approved_by, points_awarded, created_at, updated_at) VALUES
  ('c7bd2c8d-e330-472e-a5d8-0f8ba23ce76f', '3dfc5617-774d-48e4-a646-78236528b87a', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'study', 'read', 'practice', 'low', '2026-02-26 00:00:00+00', false, false, false, NULL, NULL, NULL, 10, '2026-02-19 17:36:05.432229+00', '2026-02-19 17:36:05.432229+00'),
  ('20f4976e-ef8d-414f-9964-477f1e481c92', '3dfc5617-774d-48e4-a646-78236528b87a', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'Write a 1000 page paper on Bitcoin', 'No AI use, freestyle it', 'project', 'high', '2026-02-27 00:00:00+00', false, true, true, '2026-02-19 17:36:49.165+00', '2026-02-19 17:38:12.086+00', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 100, '2026-02-19 14:55:31.850707+00', '2026-02-19 17:38:13.219069+00'),
  ('b45fdfbf-0437-4ecc-8873-33463d6d9185', '3dfc5617-774d-48e4-a646-78236528b87a', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'test job', NULL, 'homework', 'medium', '2026-02-27 00:00:00+00', false, false, false, NULL, NULL, NULL, 10, '2026-02-26 17:43:43.548818+00', '2026-02-26 17:43:43.548818+00'),
  ('badb6082-6df4-4923-acac-0768be2ab761', '3dfc5617-774d-48e4-a646-78236528b87a', 'b1a0ea5f-94fc-465c-8772-08e2ba156cd0', 'do something', 'something', 'homework', 'medium', '2026-03-10 00:00:00+00', false, false, false, NULL, NULL, NULL, 100, '2026-03-01 21:26:29.296251+00', '2026-03-01 21:26:29.296251+00')
ON CONFLICT DO NOTHING;
