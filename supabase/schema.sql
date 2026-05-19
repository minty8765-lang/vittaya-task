-- Supabase schema for task management app

-- Profiles table stores users and roles
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('admin', 'employee')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Tasks table stores assignments and status
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  assignee_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'submitted', 'approved', 'overdue')),
  due_date date not null,
  attachment_url text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Task submissions store employee submissions with optional attachment
create table if not exists task_submissions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  submitted_by uuid not null references profiles(id) on delete cascade,
  note text,
  attachment_url text,
  submitted_at timestamp with time zone default timezone('utc', now())
);

-- Optional index for task lookups by assignee and status
create index if not exists idx_tasks_assignee_status on tasks (assignee_id, status);
create index if not exists idx_task_submissions_task_id on task_submissions (task_id);
