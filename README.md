This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project overview

A responsive task management app for assigning work to employees.

Features:
- Login with Supabase Auth
- Admin dashboard for task monitoring
- Employee dashboard to view and submit assigned tasks
- Create task flow with due date and image attachment
- Statuses: `pending`, `in_progress`, `submitted`, `approved`, `overdue`

## Folder structure

- `app/`
  - `page.tsx` — landing page
  - `app/login/page.tsx` — login flow
  - `app/dashboard/page.tsx` — admin dashboard
  - `app/employee/page.tsx` — employee dashboard
  - `app/tasks/page.tsx` — task list
  - `app/tasks/new/page.tsx` — create task page
- `app/components/` — reusable UI components
- `app/lib/` — Supabase client and helpers
- `app/hooks/` — auth hooks and data hooks
- `app/types/` — shared TypeScript types
- `supabase/schema.sql` — database schema

## Supabase database schema

See `supabase/schema.sql` for tables:
- `profiles`
- `tasks`
- `task_submissions`

## Installation

1. Install dependencies:

```bash
npm install
```

2. Install Supabase client packages:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

3. Create a Supabase project at https://app.supabase.com/.

4. Add environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Create the tables using `supabase/schema.sql` in Supabase SQL editor or `supabase` CLI.

6. Start development server:

```bash
npm run dev
```

## Optional Supabase setup

- Create a storage bucket named `task-attachments` for image uploads.
- Enable email auth in Supabase Auth settings.
- Use row-level security policies if you add backend queries.

## Next steps

Once installation is complete, implement:
- Supabase client wrapper in `app/lib/supabaseClient.ts`
- Auth flow in `app/login/page.tsx`
- Admin and employee dashboards
- Task create/edit forms with image upload support

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
