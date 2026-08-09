create extension if not exists pgcrypto;

create type public.user_role as enum ('super_admin', 'admin', 'worker');
create type public.report_status as enum (
  'submitted', 'under_review', 'assigned', 'in_progress',
  'resolved', 'closed', 'rejected'
);
create type public.ticket_status as enum (
  'assigned', 'accepted', 'in_progress', 'blocked', 'completed', 'cancelled'
);
create type public.priority_level as enum ('low', 'medium', 'high', 'urgent');
create type public.notification_status as enum ('pending', 'sent', 'delivered', 'failed');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 100),
  department_id uuid references public.departments(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  role public.user_role not null default 'worker',
  department_id uuid references public.departments(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  tracking_token_hash text not null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(title) between 5 and 160),
  description text not null check (char_length(description) between 10 and 5000),
  location text not null check (char_length(location) between 2 and 300),
  building text,
  room text,
  reporter_name text,
  reporter_email text,
  status public.report_status not null default 'submitted',
  priority public.priority_level not null default 'medium',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  report_id uuid not null references public.reports(id) on delete restrict,
  assigned_worker_id uuid references public.profiles(id) on delete set null,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  title text not null check (char_length(title) between 5 and 160),
  instructions text,
  status public.ticket_status not null default 'assigned',
  priority public.priority_level not null default 'medium',
  due_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_updates (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  previous_status public.ticket_status,
  new_status public.ticket_status,
  message text check (message is null or char_length(message) between 1 and 3000),
  created_at timestamptz not null default now(),
  check (new_status is not null or message is not null)
);

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_update_id uuid not null references public.ticket_updates(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  recipient text not null,
  report_id uuid references public.reports(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  idempotency_key text not null unique,
  provider_message_id text,
  status public.notification_status not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index reports_status_created_idx on public.reports(status, created_at desc);
create index reports_category_idx on public.reports(category_id);
create index tickets_worker_status_idx on public.tickets(assigned_worker_id, status);
create index tickets_report_idx on public.tickets(report_id);
create index tickets_due_idx on public.tickets(due_at) where status not in ('completed', 'cancelled');
create index ticket_updates_ticket_created_idx on public.ticket_updates(ticket_id, created_at);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('super_admin', 'admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'super_admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    old.role is distinct from new.role
    or old.active is distinct from new.active
    or old.department_id is distinct from new.department_id
  ) and not public.is_super_admin()
    and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Only a super administrator can change profile access fields';
  end if;

  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger protect_profile_access_fields before update on public.profiles
for each row execute function public.protect_profile_access_fields();
create trigger reports_updated_at before update on public.reports
for each row execute function public.set_updated_at();
create trigger tickets_updated_at before update on public.tickets
for each row execute function public.set_updated_at();
create trigger notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_attachments enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_updates enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "public reads active departments"
on public.departments for select to anon, authenticated using (active or public.is_admin());
create policy "admins manage departments"
on public.departments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads active categories"
on public.categories for select to anon, authenticated using (active or public.is_admin());
create policy "admins manage categories"
on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "users read own profile and admins read profiles"
on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "users update own basic profile"
on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "super admins manage profiles"
on public.profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "admins manage reports"
on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workers read reports for assigned tickets"
on public.reports for select to authenticated using (
  exists (select 1 from public.tickets where report_id = reports.id and assigned_worker_id = auth.uid())
);

create policy "admins manage report attachments"
on public.report_attachments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workers read attachments for assigned tickets"
on public.report_attachments for select to authenticated using (
  exists (
    select 1 from public.tickets
    where report_id = report_attachments.report_id and assigned_worker_id = auth.uid()
  )
);

create policy "admins manage tickets"
on public.tickets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workers read assigned tickets"
on public.tickets for select to authenticated using (assigned_worker_id = auth.uid());

create policy "admins manage ticket updates"
on public.ticket_updates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workers read assigned ticket updates"
on public.ticket_updates for select to authenticated using (
  exists (select 1 from public.tickets where id = ticket_updates.ticket_id and assigned_worker_id = auth.uid())
);
create policy "workers add assigned ticket updates"
on public.ticket_updates for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.tickets where id = ticket_updates.ticket_id and assigned_worker_id = auth.uid()
  )
);

create policy "admins manage ticket attachments"
on public.ticket_attachments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workers read assigned ticket attachments"
on public.ticket_attachments for select to authenticated using (
  exists (
    select 1 from public.ticket_updates u
    join public.tickets t on t.id = u.ticket_id
    where u.id = ticket_attachments.ticket_update_id and t.assigned_worker_id = auth.uid()
  )
);
create policy "workers add attachments to own updates"
on public.ticket_attachments for insert to authenticated with check (
  exists (
    select 1 from public.ticket_updates u
    join public.tickets t on t.id = u.ticket_id
    where u.id = ticket_attachments.ticket_update_id
      and u.author_id = auth.uid() and t.assigned_worker_id = auth.uid()
  )
);

create policy "admins read notifications"
on public.notifications for select to authenticated using (public.is_admin());
create policy "admins read audit logs"
on public.audit_logs for select to authenticated using (public.is_admin());

insert into public.departments (name) values
  ('Facilities'), ('Electrical'), ('Plumbing'), ('ICT'), ('Security');

insert into public.categories (name, department_id)
select category.name, department.id
from (values
  ('Broken furniture', 'Facilities'),
  ('Building damage', 'Facilities'),
  ('Electrical fault', 'Electrical'),
  ('Water or plumbing issue', 'Plumbing'),
  ('Internet or equipment issue', 'ICT'),
  ('Safety hazard', 'Security')
) as category(name, department_name)
join public.departments department on department.name = category.department_name;
