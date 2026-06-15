# Zerodha Online Production Tracker

Internal production tracker for LearnApp / Zerodha Online B2B content operations. Replaces Google Sheets with a single tool for tracking project status, ownership, timelines, delays, and delivery.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** — database, auth, RLS

## Quick Start

### 1. Clone & install

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env.local` and fill in your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Run the schema in **Supabase SQL Editor**:

```bash
# Paste contents of:
supabase/schema.sql
```

4. Enable **Email/Password** auth in Supabase Dashboard → Authentication → Providers

### 3. Create your first admin user

In Supabase Dashboard → Authentication → Users → **Add user**:
- Email: `admin@learnapp.com`
- Password: (your choice)
- Copy the user's UUID

Then run in SQL Editor:

```sql
INSERT INTO profiles (id, name, email, role, organization, is_active)
VALUES ('YOUR-USER-UUID', 'Admin User', 'admin@learnapp.com', 'Admin', 'LearnApp', true);
```

### 4. Seed sample data (optional)

```bash
# Paste contents of supabase/seed.sql in SQL Editor
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — users, settings, all projects |
| **Internal Team** | Create/edit projects, update stages, all views |
| **Agency** | Only assigned projects; limited field edits |
| **Zerodha Viewer** | Read-only external view |

Agency users must have `organization` set to match an agency name (e.g. `Studio Alpha`).

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Stats cards + filtered project table |
| `/board` | Kanban board with drag-and-drop stage changes |
| `/projects` | Full project list with filters |
| `/projects/new` | Create project form |
| `/projects/[id]` | Project detail — timeline, comments, activity |
| `/monthly-report` | IP-wise monthly metrics |
| `/agency-view` | Agency-scoped dashboard |
| `/zerodha-view` | Read-only stakeholder view |
| `/users` | Admin user management |
| `/settings` | IPs, types, stages, agencies, editors |

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated pages with sidebar
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── board/          # Kanban
│   ├── layout/         # Sidebar, Topbar, AppShell
│   ├── projects/       # Table, Form, Timeline, etc.
│   ├── reports/
│   ├── ui/             # Badge, Button, Input, Modal, etc.
│   └── users/
├── context/            # AuthContext
└── lib/
    ├── actions/        # Server actions
    ├── data/           # Data fetching
    ├── supabase/       # Client, server, admin, middleware
    ├── auth.ts
    ├── constants.ts
    ├── types.ts
    └── utils.ts
supabase/
├── schema.sql          # Tables, RLS, triggers, seed lookups
└── seed.sql            # 10 sample projects
```

## Health Logic

| Condition | Health |
|-----------|--------|
| Stage = Delivered | Delivered |
| Stage = Hold | On hold |
| Target date passed | Delayed |
| Target within 3 days | At risk |
| Otherwise | On track |

## Stage Changes

Every stage change automatically:
- Creates a `stage_history` record
- Updates `last_status_update_at`
- Sets `delivered_date` when moving to Delivered
- Recalculates health status

Hold can happen at any time and projects can resume from Hold to any stage. Full timeline is preserved.

## Deploy

Works on Vercel. Set the same env vars in your Vercel project settings.
