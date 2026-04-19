-- PathPilot initial production schema
-- Run in Supabase SQL editor or migration runner.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  college text,
  branch text,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  profile jsonb not null,
  report_data jsonb not null,
  risk_score integer,
  plan text default 'free'
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  plan text not null,
  amount integer not null,
  status text default 'pending',
  token text unique,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  battle_id text unique not null,
  creator_profile jsonb,
  joiner_profile jsonb,
  creator_report jsonb,
  joiner_report jsonb,
  winner text,
  status text default 'waiting',
  created_at timestamptz default now()
);

create index if not exists idx_reports_user_created_at on public.reports (user_id, created_at desc);
create index if not exists idx_payments_user_created_at on public.payments (user_id, created_at desc);
create index if not exists idx_payments_report_id on public.payments (report_id);
create index if not exists idx_battles_battle_id on public.battles (battle_id);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;
alter table public.battles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "reports_update_own"
  on public.reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "payments_select_own"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "payments_insert_own"
  on public.payments for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "payments_update_own"
  on public.payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "battles_read_authenticated"
  on public.battles for select
  using (auth.role() = 'authenticated');

create policy "battles_write_authenticated"
  on public.battles for insert
  with check (auth.role() = 'authenticated');

create policy "battles_update_authenticated"
  on public.battles for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, college, branch)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'college', ''),
    coalesce(new.raw_user_meta_data ->> 'branch', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
