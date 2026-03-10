

## Plan: Class Roster, Per-Child Class Enrollment, and Flow Improvements

### Context & Design Decisions

For 5-year-olds, **one teacher per student is the norm**. Multiple teachers per student adds unnecessary complexity. The current model already supports it via `teacher_student_links`, but we won't optimize for it.

The real gap: **a parent with multiple children needs to enroll a specific child into a specific class using an invite code**, *after* account creation. Currently the code is only consumed at parent signup and auto-links all future students to one class.

### Changes

#### 1. Teacher Dashboard — Class Roster View

Add a roster section to each class in the "Manage Classes" dialog (or inline on the dashboard). Query `class_students` → `profiles` to show student names per class.

**Files:** `src/pages/TeacherDashboard.tsx`
- In the classes list (Manage Classes dialog or main dashboard), show student count per class
- Add expandable roster showing student names
- Fetch class roster data: join `class_students` with `profiles`

#### 2. Parent Dashboard — "Join Class with Code" Flow

Add a new action on the Parent Dashboard: "Join a Class". Parent enters an invite code and selects which of their children to enroll.

**Files:** `src/pages/ParentDashboard.tsx`
- Add "Join Class" button/dialog
- Parent enters invite code → we look up the code to find `teacher_id` and `class_id`
- Parent selects which child to enroll
- Backend logic: insert into `class_students`, create `teacher_student_links` if not exists

**New Edge Function:** `supabase/functions/enroll-student-in-class/index.ts`
- Accepts: `{ code: string, studentId: string }`
- Validates: caller is parent, student is their child (via `parent_student_links`), code is valid/unexpired
- Inserts into `class_students` and `teacher_student_links` (if not already linked)
- Does NOT mark the code as "used" (codes should be reusable by multiple parents for the same class)

#### 3. Make Invite Codes Reusable

Currently `used_by` marks a code as consumed by one parent. For the "one code per class, shared with all parents" model, codes should be reusable.

**Database migration:**
- Add a `max_uses` column (integer, default null = unlimited) to `invite_codes`
- Add an `invite_code_uses` table to track each redemption:
  ```
  invite_code_uses(id, code_id, parent_id, student_id, used_at)
  ```
- Update the "Active Invite Codes" display to show use count instead of hiding used codes

#### 4. Student Dashboard — Show Classes (Optional, lightweight)

Show a small "My Classes" section on the student dashboard by querying `class_students` → `classes`.

**Files:** `src/pages/StudentDashboard.tsx`
- Fetch classes via `class_students` where `student_id = user.id`, join with `classes` for name
- Display as small badges/chips in the header or above the task list

### Implementation Order

1. **Database migration** — add `max_uses` to `invite_codes`, create `invite_code_uses` table with RLS
2. **Edge function** — `enroll-student-in-class` 
3. **Teacher Dashboard** — class roster display
4. **Parent Dashboard** — "Join Class" dialog with child selector
5. **Student Dashboard** — show enrolled classes (lightweight)

### Suggestion

Since these are 5-year-olds, consider: the **parent is the primary user**, not the student. The student dashboard should be as simple as possible (it already is). The parent should be the one managing class enrollment, viewing progress, etc. The current architecture supports this well.

