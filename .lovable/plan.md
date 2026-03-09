

## Fix: Invite Code Flow Not Linking Students to Teacher's Class

### Root Cause

The `invite_codes` table has an UPDATE RLS policy that only allows the **teacher** (`auth.uid() = teacher_id`) to update rows. When a parent signs up and tries to redeem the code by setting `used_by` to their own ID, the update **silently fails** due to RLS.

Later, the `create-student` edge function queries `invite_codes WHERE used_by = parent_id` — finds nothing — so the auto-linking to teacher/class never happens.

### Fix (2 changes)

**1. Add an RLS policy allowing parents to redeem invite codes**

Add a new UPDATE policy on `invite_codes` that allows any authenticated user to update `used_by` and `used_at` on rows where `used_by IS NULL` (unclaimed codes):

```sql
CREATE POLICY "Anyone can redeem unused invite codes"
ON public.invite_codes FOR UPDATE
TO authenticated
USING (used_by IS NULL)
WITH CHECK (used_by = auth.uid());
```

This ensures parents can claim a code but can't overwrite someone else's claim.

**2. Deploy the `create-student` edge function** (if not already deployed on external project)

The function logic itself is correct — it queries `invite_codes WHERE used_by = caller.id` and links teacher/class. It just never finds a match because step 1 was failing.

### Why the invite code matters (vs email linking)

The invite code flow is the **scalable** approach: teacher generates one code per class, shares it with all parents, and every student created by those parents auto-links to the correct teacher AND class. The email approach requires the teacher to manually link each student one by one.

