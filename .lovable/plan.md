

## Build Errors Fix + Architecture Redesign Plan

### Part 1: Fix Build Errors (Quick Fixes)

**3 errors to fix:**

1. **`supabase/functions/create-student/index.ts` line 124** and **`supabase/functions/link-student/index.ts` line 119**: `err` is of type `unknown`. Fix: cast to `(err as Error).message`.

2. **`src/pages/StudentDashboard.tsx` line 115**: The `insert` call includes `student_id` but is missing the required `assigned_by` column. Fix: add `assigned_by: user.id` to the insert object.

---

### Part 2: Architecture Discussion — Classes, Multiple Children, and Invite Codes

You raise three important design questions. Here is the proposed approach:

#### A. Multiple Classes per Teacher

Add a `classes` table and a `class_students` join table. Teachers create classes (e.g., "Math Period 3"), assign students to classes, and can assign tasks to an entire class at once instead of individual students.

```text
classes
├── id (uuid)
├── teacher_id (uuid)
├── name (text) — e.g. "Math Period 3"
├── created_at

class_students
├── class_id (uuid)
├── student_id (uuid)
```

Tasks would optionally reference a `class_id` in addition to `student_id`, so teachers can bulk-assign.

#### B. Multiple Children per Parent

This already works — the `parent_student_links` table supports multiple rows per parent. The Parent Dashboard already renders a child selector when `children.length > 1`. No schema change needed.

#### C. Invite Code Flow (Recommended New Onboarding)

Instead of parents independently signing up, the teacher drives the process:

1. **Teacher generates an invite code** (e.g., 6-character alphanumeric, tied to a class).
2. **Parent signs up using that code** — this automatically links the parent to the teacher/class.
3. **Parent creates their child's student account** from their dashboard (existing flow).
4. **Student is auto-linked** to the teacher and class via the invite code context.

New table:

```text
invite_codes
├── id (uuid)
├── code (text, unique) — e.g. "ABC123"
├── teacher_id (uuid)
├── class_id (uuid, nullable)
├── used_by (uuid, nullable) — parent who used it
├── used_at (timestamp, nullable)
├── expires_at (timestamp)
├── created_at
```

Flow changes:
- **Teacher Dashboard**: New "Generate Invite Code" button that creates a code for a specific class
- **Parent Auth page**: Add an "Invite Code" field during signup
- **`create-student` edge function**: When parent creates student, auto-link to the teacher from the invite code
- Remove the manual "link student by email" flow from teacher dashboard (or keep as fallback)

---

### Implementation Order

1. Fix the 3 build errors (immediate)
2. Add `classes` and `class_students` tables with RLS
3. Add `invite_codes` table with RLS
4. Create `generate-invite-code` edge function
5. Update Parent Auth to accept invite codes during signup
6. Update `create-student` edge function to auto-link via invite code
7. Update Teacher Dashboard with class management and invite code generation
8. Update task assignment to support class-wide assignment

This is a significant feature set. Should I proceed with all of it, or start with just the build fixes and the invite code flow first?

