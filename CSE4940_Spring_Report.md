# Webquity — CSE 4940 Final Project Documentation

**Team Members:** Rohit, Tim, Khalon, Omar, Anesh  
**Faculty Advisor:** Professor Wei Wei  
**Semester:** Spring 2025  

---

## Table of Contents

1. [Project Description](#1-project-description)  
2. [Design](#2-design)  
3. [Implementation](#3-implementation)  
4. [Evaluation](#4-evaluation)  
5. [New Knowledge](#5-new-knowledge)  
6. [Ownership](#6-ownership)  

---

## 1. Project Description

### 1.1 Problem Statement

Attention-Deficit/Hyperactivity Disorder (ADHD) affects an estimated 6–9% of school-age children worldwide. Students with ADHD face significant challenges with executive functioning — organizing tasks, sustaining focus, managing time, and maintaining motivation. Traditional homework management tools (Google Classroom, Canvas, standard to-do apps) are not designed with these students in mind: they present dense interfaces, offer no positive reinforcement, and lack the structured guidance that ADHD learners need.

Parents and teachers also struggle to coordinate support. Teachers assign tasks across multiple channels, parents have limited visibility into what's due, and there is no shared workflow for verifying completion. This disconnect means students often slip through the cracks.

**Webquity** addresses this gap: it is a distraction-free, gamified task management web application purpose-built for students with ADHD (ages 8–14), connecting students, parents, and teachers in a single platform with a calm, encouraging interface.

### 1.2 Minimum Viable Product

**Fall Semester MVP:**
- Role-based authentication (student, parent, teacher)
- Task creation and assignment by teachers
- A student dashboard with task list, completion workflow, and basic point tracking
- A parent dashboard to view child progress
- An AI chatbot ("Focus Buddy") for study support

**Spring Semester MVP:**
- Class and invite code system for multi-student management
- Approval-based task completion workflow (student requests → teacher approves → points awarded)
- Pomodoro timer with AI chatbot integration (set/start/pause/reset via natural language)
- Gamification panel: levels, streaks, badges
- Content moderation (profanity filter + AI safety guard)
- Deployment to Vercel for production hosting
- Supabase Edge Functions for secure server-side operations

### 1.3 Alternative Approaches Considered

We evaluated three technology stacks for building Webquity:

| Criterion | **React + Supabase + Vite (Chosen)** | **Next.js + Firebase** | **Flutter Web + Custom REST API** |
|---|---|---|---|
| **Learning Curve** | Moderate — React is widely taught; Supabase has SQL-based APIs familiar from database courses | Moderate — Next.js adds SSR complexity; Firebase has its own query language | High — Dart is a new language for the team; Flutter Web is less mature |
| **Real-time Capabilities** | Supabase Realtime (Postgres changes), Socket.IO for timer sync | Firebase Realtime DB / Firestore listeners — excellent real-time | Requires manual WebSocket or polling implementation |
| **Authentication** | Supabase Auth with Row-Level Security (RLS) — auth and data security in one system | Firebase Auth — mature, but security rules are a separate DSL | Must build or integrate a third-party auth system |
| **Cost at Scale** | Supabase free tier generous (500 MB DB, 50K auth users); Edge Functions included | Firebase free tier good for reads, but writes can spike costs | Server hosting costs (e.g., AWS/GCP) add up; no built-in free tier |
| **Deployment** | Static SPA deployable to Vercel/Netlify for free; backend is Supabase-hosted | Vercel is the native host for Next.js; good DX | Requires a server for the API; Flutter Web bundles are large |
| **PostgreSQL + RLS** | Native — direct SQL, row-level security policies written in SQL | No — NoSQL document model; security rules are JSON-like | Possible but requires manual setup |
| **Edge Functions** | Built-in (Deno-based), deployed with `supabase functions deploy` | Cloud Functions (Node.js), requires separate deployment pipeline | Not applicable — must deploy own serverless functions |
| **Team Familiarity** | 4/5 members had React experience from coursework | 3/5 had some Next.js exposure | 0/5 had Flutter experience |

**Decision:** React + Supabase + Vite was selected because it offered the strongest combination of team familiarity, integrated authentication with Row-Level Security, a generous free tier, and the simplest deployment path for a static SPA. The SQL-based data model also aligned with the team's database coursework, making schema design and RLS policy authoring more intuitive than Firebase's NoSQL security rules or building a custom REST API from scratch.

---

## 2. Design

### 2.1 System Architecture

Webquity follows a **three-tier architecture** with a clear separation between the client application, the backend-as-a-service layer (Supabase), and an auxiliary AI server:

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│  React 18 SPA + React Router + TanStack Query            │
│  Vite build → static assets on Vercel                    │
│  Components: AuthPage, StudentDashboard, TeacherDashboard│
│              ParentDashboard, ChatBot, PomodoroTimer,    │
│              GamificationPanel, ProtectedRoute           │
└────────────┬──────────────────┬──────────────────────────┘
             │  HTTPS           │  HTTPS / WebSocket
             ▼                  ▼
┌────────────────────┐  ┌────────────────────────────────┐
│   Supabase Cloud   │  │   Flask AI Server (port 5001)  │
│  ┌──────────────┐  │  │  Ollama: phi3:mini (chat)      │
│  │  Auth         │  │  │  Ollama: llama-guard3 (safety) │
│  │  (JWT + RLS)  │  │  │  better_profanity filter       │
│  ├──────────────┤  │  │  Socket.IO (timer sync)         │
│  │  PostgreSQL   │  │  └────────────────────────────────┘
│  │  + RLS Policies│ │
│  ├──────────────┤  │
│  │  Edge Functions│ │
│  │  (Deno)       │  │
│  └──────────────┘  │
└────────────────────┘
```

**Client Layer:** A React 18 single-page application built with Vite and TypeScript. Routing is handled by React Router v6 with `BrowserRouter`. UI components use shadcn/ui (Radix primitives + Tailwind CSS). State management combines React Context (for auth state) with TanStack React Query (for server state caching).

**Supabase Layer:** Provides authentication (email/password with JWT), a PostgreSQL database with 12+ tables and comprehensive Row-Level Security policies, and Deno-based Edge Functions for privileged operations (creating student accounts, generating invite codes, enrolling students in classes).

**AI Server Layer:** A Flask application running locally that integrates with Ollama for local LLM inference. Uses `phi3:mini` for conversational responses and `llama-guard3` for content safety classification. Also runs `better_profanity` as a fast first-pass profanity filter. Socket.IO provides real-time WebSocket communication for timer control actions. An alternative Supabase Edge Function (`focus-buddy-chat`) exists as a cloud-hosted fallback using the Lovable AI gateway.

### 2.2 Database Schema

The PostgreSQL database contains the following core tables:

- **profiles** — User profile data (full_name, avatar_url), keyed by `user_id` referencing `auth.users`
- **user_roles** — Maps each user to a single `app_role` enum value (`student`, `parent`, `teacher`), with a unique constraint on `user_id`
- **student_stats** — Gamification state: `points`, `streak_days`, `tasks_completed`, `last_completed_date`
- **tasks** — Central task entity with title, description, category, priority, due_date, completion workflow fields (`completion_requested`, `completion_approved`, `approved_at`, `approved_by`), and `points_awarded`
- **parent_student_links** / **teacher_student_links** — Relationship tables linking parents/teachers to students
- **classes** — Teacher-created class groups
- **class_students** — Join table for class membership
- **invite_codes** — Time-limited, optionally class-scoped codes teachers generate for onboarding
- **invite_code_uses** — Tracks each redemption of an invite code (supports `max_uses`)
- **badges** — Badge definitions (name, description, icon, points_required)

All tables have Row-Level Security enabled. A `has_role(user_id, role)` function (SECURITY DEFINER) is used in policy conditions to check roles without exposing the `user_roles` table directly. Policies are explicitly created as PERMISSIVE (a migration was dedicated to fixing an early bug where policies were inadvertently RESTRICTIVE).

### 2.3 Authentication & Authorization

Authentication is handled by Supabase Auth (email/password, no email confirmation required for rapid onboarding of young students). Key design decisions:

1. **Session persistence:** The Supabase client is configured with `persistSession: true` and `storage: localStorage`, so sessions survive page refreshes.

2. **AuthContext pattern:** A React Context (`AuthContext.tsx`) wraps the entire app and exposes `user`, `session`, `profile`, `role`, `studentStats`, and auth actions. On mount, it calls `supabase.auth.getSession()` as the source of truth and subscribes to `onAuthStateChange` for subsequent events.

3. **Timeout resilience:** All Supabase database queries in the auth flow use a `withTimeout()` helper that races the query against a 4-second deadline. If the database is slow or unreachable, the system falls back to JWT metadata (role stored in `user_metadata` at sign-up time).

4. **ProtectedRoute component:** A route guard that checks loading state, user presence, and role. Includes a 6-second timeout with a "Sign Out & Retry" escape hatch to prevent users from being permanently stuck on a loading screen.

5. **Row-Level Security (RLS):** Every table has fine-grained policies. Students can only view/update their own data. Teachers can view/update tasks they assigned and stats of linked students. Parents can view their children's data. Edge Functions use the service_role key for privileged operations.

### 2.4 Design Evolution

The design evolved significantly over the year:

- **Fall → Spring: Class system added.** Originally, teachers linked to individual students by email. In Spring, we added a class/invite-code system that allows teachers to create classes, generate time-limited invite codes, and have parents enroll children via those codes — far more scalable.

- **Monolithic auth → resilient auth.** The initial auth flow was a simple `getSession()` + direct queries. In production, we discovered that Supabase queries could hang on deployed hosts, causing infinite loading spinners, so we added timeout wrappers, JWT metadata fallbacks, and safety timeouts.

- **Single chat backend → dual chat backends.** We started with a Supabase Edge Function (`focus-buddy-chat`) using a cloud AI gateway. We later added a local Flask server with Ollama for local-first AI, supporting offline development and eliminating API costs. Both backends coexist — the client can be pointed at either via an environment variable.

- **Content moderation: fail-closed → fail-open.** The AI safety guard (`llama-guard3`) initially returned `false` (unsafe) on any exception, which blocked all messages when the model wasn't loaded. We changed this to fail-open, relying on the profanity filter as the always-on safety net.

### 2.5 Broader Impact Considerations

- **Public Health:** The app directly supports the mental health and academic well-being of children with ADHD by providing structured task management and positive reinforcement, reducing anxiety associated with disorganized schoolwork.

- **Public Safety:** Content moderation (profanity filter + AI safety guard) protects children from generating or receiving inappropriate content through the chatbot.

- **Public Welfare:** By connecting parents, teachers, and students in a shared workflow, the app improves educational equity — giving parents real-time visibility into assignments regardless of socioeconomic background.

- **Global Factors:** The app is web-based and accessible from any device with a browser, reducing the barrier to entry compared to native apps. The interface uses simple English appropriate for ages 8–14.

- **Cultural Factors:** The gamification system (points, streaks, badges) draws on positive reinforcement psychology effective across cultures. The mascot (a dancing owl with a graduation cap) provides a friendly, culturally neutral visual anchor.

- **Social Factors:** Role-based access ensures students interact only with their assigned tasks and chatbot (no social features or peer comparison that could cause anxiety). The parent and teacher dashboards foster healthy oversight without surveillance.

- **Environmental Factors:** The application is entirely digital, eliminating paper-based task tracking. Hosting on Vercel's edge network and Supabase's cloud infrastructure means no dedicated server hardware.

- **Economic Factors:** Built entirely with free-tier services (Supabase free tier, Vercel free tier, open-source Ollama models). The stack was chosen specifically to ensure the app can operate at zero cost for schools and families.

---

## 3. Implementation

### 3.1 Development Process

Our team followed a **modified Scrum** methodology adapted for a senior design team of five members working part-time alongside other courses.

**What is Scrum?** Scrum is an Agile software development framework built around iterative development in fixed-length "sprints." A team maintains a prioritized product backlog of features. At the start of each sprint, the team selects items from the backlog to commit to. Daily stand-up meetings keep the team synchronized. At the end of each sprint, the team reviews what was delivered and retrospects on what can improve.

**How we applied Scrum:**

- **Sprint length:** 2-week sprints, starting Monday and ending Friday of the second week.
- **Meetings:** We held weekly team meetings (Mondays) combining planning and stand-up. Given part-time availability, a single weekly sync was more practical than daily stand-ups. We communicated asynchronously via a group chat throughout the week.
- **Sprint planning:** At each Monday meeting, we reviewed the backlog, assigned tasks, and set goals for the sprint. We used GitHub Issues to track individual work items.
- **Sprint review/retro:** At the end of each sprint, we reviewed live demos of completed features and discussed blockers. Retrospectives were informal but consistent.
- **Modifications:** We skipped the formal Scrum Master and Product Owner roles. Instead, all team members jointly owned the backlog, and the faculty advisor provided external stakeholder feedback at periodic checkpoints.

### 3.2 Workflow and Tools

- **Version Control:** Git with GitHub. The repository is organized with the frontend source in `src/`, Supabase migrations in `supabase/migrations/`, and Edge Functions in `supabase/functions/`. Feature branches were used for new work.
- **Project Management:** GitHub Issues and the Projects board. Each issue was tagged with labels (e.g., `frontend`, `backend`, `bug`, `feature`) and assigned to a team member.
- **Development Environment:** VS Code with ESLint, Prettier, and the Vite dev server. TypeScript strict mode. The Supabase CLI was used for migration management (`supabase db push`, `supabase functions deploy`).
- **Package Management:** Bun (primary) for fast installs; npm as fallback. Dependencies managed via `package.json`.
- **Deployment Pipeline:** Frontend deployed to Vercel via Git push (auto-build with `vite build`). Supabase migrations and Edge Functions deployed via the Supabase CLI. The Flask AI server runs locally (production deployment deferred to future work).

### 3.3 Key Implementation Details

**Frontend (React + TypeScript):**

The application is structured around five core pages:

1. **Index (Landing Page):** A role-selection hub with three portal cards (Student, Parent, Teacher), a project description, and the Webquity logo.

2. **AuthPage:** Shared login/signup form used by all three role-specific auth routes (`/auth/student`, `/auth/parent`, `/auth/teacher`). Handles sign-up with role metadata, invite code input for parents, and redirects already-authenticated users.

3. **StudentDashboard:** The primary student experience. Features:
   - Task list with completion-request workflow (tap to request → awaits teacher approval)
   - AI chatbot panel ("Focus Buddy") for conversational study help and task management
   - Pomodoro timer with configurable focus/break durations
   - Gamification panel showing points, level, streak, and badge progress
   - Animated owl mascot with an encouraging message

4. **TeacherDashboard:** Full class and student management:
   - Create and manage classes
   - Link students by email
   - Generate time-limited invite codes (with copy-to-clipboard, invalidation, and use-count tracking)
   - Assign tasks to individual students or entire classes
   - Approve or reject completion requests (auto-awards points and updates streaks)
   - View active, pending, and completed task lists

5. **ParentDashboard:** Child oversight:
   - View linked children's stats (points, streaks, tasks completed this week)
   - Create student accounts directly from the parent dashboard
   - Enroll students in classes using invite codes
   - View pending and completed task lists per child

**Backend (Flask + Ollama):**

The `server.py` Flask application serves the `/api/chat` endpoint:

1. **Input moderation:** First checks `better_profanity` (fast dictionary lookup), then passes the message to `llama-guard3` via Ollama for AI-based safety classification.
2. **Action parsing:** Regex-based extraction of timer and task commands from natural language (e.g., "set a 25 minute timer" → `{type: "set_timer", focusMinutes: 25}`).
3. **Response generation:** If no actions are detected, the message is forwarded to `phi3:mini` via Ollama with a 200-token limit and 0.7 temperature.
4. **Output moderation:** The bot's response is also checked for safety before being returned.
5. **Real-time sync:** Timer actions are emitted via Socket.IO so the Pomodoro timer component reacts in real time.

**Supabase Edge Functions (Deno/TypeScript):**

Five Edge Functions handle privileged server-side operations:

1. **create-student:** Parents create student accounts. Uses the admin API (`auth.admin.createUser`) to create a confirmed user, then sets up profile, role, stats, and parent-student link rows. Auto-links to the teacher/class of the parent's most recent invite code.

2. **generate-invite-code:** Teachers generate 6-character alphanumeric codes (ambiguity-free character set: no O/0/1/I/l). Codes are scoped to a class and have a configurable expiration (default: 7 days). Retries up to 5 times on collision.

3. **enroll-student-in-class:** Parents redeem an invite code to enroll a child. Validates code expiration, revocation, max_uses, and parent-child relationship. Creates class_students entry, teacher-student link, and invite_code_uses record. Idempotent — re-enrolling returns success with an `alreadyEnrolled` flag.

4. **link-student:** Teachers link to a student by email. Looks up the user via the admin API, verifies they have the student role, and creates a teacher-student link.

5. **focus-buddy-chat:** Cloud-hosted chatbot alternative using the Lovable AI gateway (Gemini 3 Flash Preview model). Includes a system prompt tailored for children, AI moderation, and timer action tag parsing.

**Database Migrations:**

The schema evolved across 9 migrations:

1. Base tables (profiles, user_roles, student_stats, tasks, badges, relationships)
2. Classes, class_students, invite_codes system
3. Invite code redemption policy
4. `invite_code_uses` table with max_uses support
5. **Critical fix:** Recreated all RLS policies as PERMISSIVE (they were inadvertently RESTRICTIVE, causing all policies to AND together instead of OR)
6. `revoked_at` column for invite code invalidation
7. Teacher UPDATE policy on student_stats (required for the approve-task → award-points flow)
8. Changed `user_roles` unique constraint from `(user_id, role)` to `(user_id)` alone (required for upsert with `onConflict: 'user_id'`)
9. Added UPDATE policy on `user_roles` (required for upsert's `ON CONFLICT DO UPDATE`)

---

## 4. Evaluation

### 4.1 Evaluation Criteria

We evaluated Webquity along four dimensions:

1. **Functional Correctness:** Do all features work as specified?
2. **Deployment Reliability:** Does the app work correctly in a production (hosted) environment, not just locally?
3. **User Experience:** Is the interface calm, intuitive, and appropriate for ADHD learners?
4. **Security:** Are authorization policies correctly enforced?

### 4.2 Testing Strategy

**Manual Testing:** Each sprint concluded with end-to-end manual testing of all user flows:
- Student: sign up → view tasks → request completion → verify points awarded after teacher approval
- Teacher: sign up → create class → generate invite code → link student → assign task → approve completion
- Parent: sign up with invite code → add student → enroll in class → view dashboard
- Chatbot: send messages → verify appropriate responses → test timer commands → verify content moderation blocks inappropriate input

**Unit Testing:** A Vitest test harness is configured (`vitest.config.ts` with jsdom environment). Example tests validate core utility functions. The testing infrastructure supports `@testing-library/react` for component testing.

**Integration Testing:** We performed integration testing by running the full stack locally (Vite dev server + Flask server + Supabase cloud) and verifying cross-component data flows (e.g., teacher creates task → student sees it → student requests completion → teacher approves → student stats update).

**Deployment Testing:** Deployment revealed critical bugs that did not manifest locally:
- **SPA routing failure:** Direct URL navigation or page refresh returned 404 on hosted platforms because the static host didn't know to serve `index.html` for all paths. Resolved with Vercel rewrite rules.
- **Supabase query hanging:** Profile/role/stats queries hung indefinitely on deployed hosts (but worked locally). Resolved with `withTimeout()` wrappers (4-second deadline) and JWT metadata fallbacks.
- **Auth state race condition:** `signIn()` returned before `onAuthStateChange` fired, causing ProtectedRoute to redirect to the login page. Resolved by eagerly setting user/session state in the `signIn` function.
- **Variable scoping bug:** A `let meta` variable declared inside a `try` block was referenced in the `catch` block, causing a ReferenceError that silently prevented `setLoading(false)` from executing — resulting in a permanent loading spinner. Identified through console log analysis and fixed by hoisting the declaration.

Each of these bugs was systematically diagnosed using browser console logs, network tab analysis, and progressive instrumentation (`[AUTH]` debug log statements throughout the auth flow).

### 4.3 Pull Request Management

Pull requests were reviewed by at least one other team member before merging. Reviewers checked for:
- Code correctness and adherence to TypeScript types
- Proper error handling (try/catch, user-facing error messages via toast notifications)
- RLS policy correctness (ensuring the right users can access the right data)
- No regressions to existing features

### 4.4 Results

As of the end of Spring semester, all features in the Spring MVP are functional:

- All three role flows (student, parent, teacher) work end-to-end
- Session persistence survives page refresh on deployed hosts
- The chatbot correctly responds to study-related queries and blocks inappropriate content
- Timer commands work via natural language ("set a 25 minute timer and start it")
- Points and streaks are correctly updated when teachers approve tasks
- Invite codes can be generated, copied, redeemed, and invalidated
- The app is live on Vercel with correct SPA routing and cache headers

---

## 5. New Knowledge

### 5.1 Technologies Learned

**Supabase (PostgreSQL + Auth + RLS + Edge Functions)**  
No team member had prior Supabase experience. We learned:
- How to design a PostgreSQL schema with foreign keys referencing `auth.users`
- Row-Level Security (RLS) policy authoring, including the critical difference between PERMISSIVE and RESTRICTIVE policies
- Supabase Auth integration (session management, JWT metadata, `onAuthStateChange` lifecycle)
- Edge Functions (Deno runtime, service role vs. anon key, CORS handling)

*How we learned:* Supabase official documentation (docs.supabase.com), YouTube tutorials by Fireship and Traversy Media, and extensive trial-and-error with RLS policies in the Supabase dashboard SQL editor.

*Estimated learning time:* 3–4 weeks to reach proficiency in schema design + RLS + Edge Functions. Recommend starting with the Supabase Quickstart tutorial, then building a small CRUD app with RLS before attempting a multi-role system.

**Ollama + Local LLMs**  
We learned to run open-source LLMs (phi3:mini, llama-guard3) locally via Ollama for both conversational AI and content safety moderation.

*How we learned:* Ollama documentation (ollama.ai), Hugging Face model cards for phi3 and llama-guard3, and experimentation with different prompt structures and temperature settings.

*Estimated learning time:* 1 week to install Ollama, pull models, and integrate with a Flask API. Understanding prompt engineering for consistent tool-use (timer actions) took an additional week.

**React + TypeScript + Vite + shadcn/ui**  
Most team members had React experience but were new to TypeScript strict mode, Vite (vs. Create React App), and the shadcn/ui component library.

*How we learned:* React documentation (react.dev), the TypeScript handbook, Vite documentation, and shadcn/ui component docs. The Radix UI primitives documentation was essential for understanding accessible component patterns.

*Estimated learning time:* 1–2 weeks for a team already comfortable with JavaScript/React. If starting from scratch, add 4–6 weeks for React fundamentals.

**Vercel Deployment for SPAs**  
We learned the nuances of deploying a client-side SPA to Vercel, including rewrite rules for React Router, cache headers for hashed assets, and the difference between Vercel's `vercel.json` configuration and framework-specific settings.

*How we learned:* Vercel documentation, Stack Overflow, and debugging a specific issue where the app worked locally but showed a blank page or 404 on Vercel until rewrite rules were added.

*Estimated learning time:* A few hours if you already understand SPA routing. The key tutorial is Vercel's "Single Page Applications" guide.

### 5.2 Skills Developed

- **Debugging production-only bugs:** Many of our most challenging bugs (hanging queries, race conditions, variable scoping) appeared only on deployed hosts. We developed systematic debugging practices: adding instrumented logging, using browser dev tools in production, and building timeout/fallback mechanisms.
- **Designing secure multi-role authorization:** Writing RLS policies for a system with three roles and complex relationships (teacher ↔ student ↔ parent, class ↔ student) required careful thinking about which operations each role should be allowed to perform.
- **Prompt engineering for tool-use:** Getting the chatbot to reliably emit timer action tags (`[TIMER:25,5,15]`) required iterating on the system prompt and testing edge cases.

### 5.3 Helpful Resources

| Resource | URL | Purpose |
|---|---|---|
| Supabase Docs | https://supabase.com/docs | Auth, RLS, Edge Functions, client SDK |
| React Documentation | https://react.dev | React 18 patterns, hooks, Context API |
| shadcn/ui | https://ui.shadcn.com | Component library documentation |
| Ollama | https://ollama.ai | Local LLM setup and model management |
| Vite | https://vitejs.dev | Build tool configuration |
| Vercel Docs | https://vercel.com/docs | SPA deployment, rewrites, headers |
| TanStack Query | https://tanstack.com/query | Server state management in React |

---

## 6. Ownership

| Section | Primary Author |
|---|---|
| Project Description | Rohit |
| Design — Architecture & Schema | Tim |
| Design — Auth & Authorization | Tim |
| Design — Broader Impact | Anesh |
| Implementation — Dev Process & Workflow | Khalon |
| Implementation — Frontend | Rohit, Tim |
| Implementation — Backend (Flask + Ollama) | Omar |
| Implementation — Edge Functions | Tim |
| Implementation — Database Migrations | Tim |
| Evaluation — Testing & Debugging | Tim, Omar |
| Evaluation — PR Management | Khalon |
| New Knowledge | All |
| Report Assembly & Editing | Tim |

---

*This document was prepared for CSE 4940, Spring 2025.*
