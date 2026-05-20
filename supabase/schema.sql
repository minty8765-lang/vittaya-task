-- ============================================================
-- Vittaya Task — Supabase Schema
-- วางในหน้า SQL Editor แล้วกด Run
-- ============================================================

-- ── 1. profiles ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'employee' check (role in ('admin', 'employee')),
  created_at  timestamptz not null default now()
);

-- auto-create profile เมื่อมี user ใหม่ใน auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. tasks ────────────────────────────────────────────────
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  created_by    uuid not null references public.profiles (id),
  -- null = งานเปิดให้รับเอง, มีค่า = assign ให้พนักงานคนนั้น
  assigned_to   uuid references public.profiles (id),
  due_date      date,
  status        text not null default 'open'
                  check (status in ('open', 'in_progress', 'pending_approval', 'completed', 'rejected')),
  reject_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();


-- ── 3. task_submissions ─────────────────────────────────────
create table if not exists public.task_submissions (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks (id) on delete cascade,
  submitted_by  uuid not null references public.profiles (id),
  description   text,
  -- เก็บ array ของ URL รูปภาพ (อัปโหลดผ่าน Supabase Storage)
  image_urls    text[] not null default '{}',
  created_at    timestamptz not null default now()
);


-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_tasks_assigned_to on public.tasks (assigned_to);
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_submissions_task_id on public.task_submissions (task_id);


-- ── RLS ─────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_submissions enable row level security;

-- profiles: ดูได้ทุกคน, แก้ได้เฉพาะตัวเอง
create policy "profiles: read all"
  on public.profiles for select using (true);

create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);

-- tasks: ดูได้ทุกคน
create policy "tasks: read all"
  on public.tasks for select using (true);

-- tasks: สร้าง/แก้ได้เฉพาะ admin
create policy "tasks: admin insert"
  on public.tasks for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "tasks: admin update"
  on public.tasks for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- task_submissions: ดูได้ทุกคน
create policy "submissions: read all"
  on public.task_submissions for select using (true);

-- task_submissions: ส่งได้เฉพาะ employee ที่เป็นเจ้าของ submission
create policy "submissions: employee insert"
  on public.task_submissions for insert
  with check (auth.uid() = submitted_by);
