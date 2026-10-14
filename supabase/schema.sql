-- ====================================================================
-- CENTRALIZED QR CODE ATTENDANCE MONITORING SYSTEM
-- Supabase PostgreSQL Schema, Indexes, and Row Level Security (RLS)
-- ====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null unique,
  user_identifier text not null unique, -- Student ID or Employee ID (e.g. EMP-2026-001)
  department text not null,
  role text not null check (role in ('admin', 'operator', 'user')) default 'user',
  profile_photo_url text,
  account_status text not null check (account_status in ('active', 'deactivated')) default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. QR CREDENTIALS TABLE
-- Cryptographic token hash is stored, never raw confidential passwords.
create table if not exists public.qr_credentials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  credential_status text not null check (credential_status in ('active', 'revoked')) default 'active',
  issued_at timestamp with time zone default now(),
  revoked_at timestamp with time zone,
  last_used_at timestamp with time zone
);

-- 3. ATTENDANCE SESSIONS TABLE
create table if not exists public.attendance_sessions (
  id uuid primary key default uuid_generate_v4(),
  session_name text not null,
  attendance_date date not null default current_date,
  check_in_start time not null default '07:30:00',
  check_in_end time not null default '10:00:00',
  check_out_start time not null default '16:00:00',
  check_out_end time not null default '19:00:00',
  late_threshold time not null default '08:15:00',
  status text not null check (status in ('active', 'upcoming', 'completed', 'cancelled')) default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- 4. ATTENDANCE RECORDS TABLE
create table if not exists public.attendance_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  check_in_at timestamp with time zone not null default now(),
  check_out_at timestamp with time zone,
  attendance_status text not null check (attendance_status in ('present', 'late', 'checked_out', 'absent', 'excused')) default 'present',
  recorded_by text default 'QR Scanner Station',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  -- Prevent duplicate check-in records for the same user in the same session
  constraint unique_user_session unique (user_id, session_id)
);

-- 5. ATTENDANCE AUDIT LOGS TABLE
create table if not exists public.attendance_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  attendance_record_id uuid references public.attendance_records(id) on delete set null,
  action text not null,
  previous_values jsonb,
  updated_values jsonb,
  performed_by text not null,
  created_at timestamp with time zone default now()
);

-- 6. SYSTEM SETTINGS TABLE
create table if not exists public.system_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text not null unique,
  setting_value jsonb not null,
  updated_by text default 'System Admin',
  updated_at timestamp with time zone default now()
);

-- INDEXES FOR FAST SCANNER LOOKUPS & REPORTING
create index if not exists idx_profiles_user_identifier on public.profiles(user_identifier);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_qr_credentials_token on public.qr_credentials(token_hash);
create index if not exists idx_qr_credentials_user_id on public.qr_credentials(user_id);
create index if not exists idx_attendance_records_user_id on public.attendance_records(user_id);
create index if not exists idx_attendance_records_session_id on public.attendance_records(session_id);
create index if not exists idx_attendance_records_check_in on public.attendance_records(check_in_at);
create index if not exists idx_attendance_sessions_date on public.attendance_sessions(attendance_date);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
alter table public.profiles enable row level security;
alter table public.qr_credentials enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- Function to check if caller is an Admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'admin' and account_status = 'active'
  );
end;
$$ language plpgsql security definer;

-- Function to check if caller is an Operator or Admin
create or replace function public.is_operator_or_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role in ('admin', 'operator') and account_status = 'active'
  );
end;
$$ language plpgsql security definer;

-- PROFILES POLICIES
create policy "Admins have full access to profiles"
  on public.profiles for all
  using (public.is_admin());

create policy "Operators can view active profiles for validation"
  on public.profiles for select
  using (public.is_operator_or_admin());

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth_user_id = auth.uid());

create policy "Users can update their own profile details"
  on public.profiles for update
  using (auth_user_id = auth.uid());

-- QR CREDENTIALS POLICIES
create policy "Admins can manage QR credentials"
  on public.qr_credentials for all
  using (public.is_admin());

create policy "Operators can read QR credentials for scanner validation"
  on public.qr_credentials for select
  using (public.is_operator_or_admin());

create policy "Users can view their own active QR credential"
  on public.qr_credentials for select
  using (
    user_id in (select id from public.profiles where auth_user_id = auth.uid())
  );

-- ATTENDANCE SESSIONS POLICIES
create policy "Anyone authenticated can view active sessions"
  on public.attendance_sessions for select
  using (true);

create policy "Admins can manage sessions"
  on public.attendance_sessions for all
  using (public.is_admin());

-- ATTENDANCE RECORDS POLICIES
create policy "Admins have full access to attendance records"
  on public.attendance_records for all
  using (public.is_admin());

create policy "Operators can insert and update attendance records"
  on public.attendance_records for insert
  with check (public.is_operator_or_admin());

create policy "Operators can view attendance records"
  on public.attendance_records for select
  using (public.is_operator_or_admin());

create policy "Users can view only their own attendance records"
  on public.attendance_records for select
  using (
    user_id in (select id from public.profiles where auth_user_id = auth.uid())
  );

-- AUDIT LOGS POLICIES
create policy "Admins can view and insert audit logs"
  on public.attendance_audit_logs for select
  using (public.is_admin());

create policy "System triggers and operators can insert audit logs"
  on public.attendance_audit_logs for insert
  with check (public.is_operator_or_admin());

-- SYSTEM SETTINGS POLICIES
create policy "Anyone authenticated can view system settings"
  on public.system_settings for select
  using (true);

create policy "Admins can modify system settings"
  on public.system_settings for all
  using (public.is_admin());
