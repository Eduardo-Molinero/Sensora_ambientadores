-- Additive tables for SENSORA BUSINESS sign-in roles and client records.
-- This migration does not alter or remove existing tables.

create table if not exists public.sensora_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('administrador', 'comercial', 'cliente')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sensora_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  status text not null default 'Activa' check (status in ('Activa', 'Pendiente', 'En revisión')),
  commercial_user_id uuid references public.sensora_profiles (user_id) on delete set null,
  client_user_id uuid unique references public.sensora_profiles (user_id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.sensora_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.sensora_profiles as profile
  where profile.user_id = (select auth.uid())
$$;

create or replace function public.sensora_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.sensora_user_role() = 'administrador', false)
$$;

revoke all on function public.sensora_user_role() from public, anon;
revoke all on function public.sensora_is_admin() from public, anon;
grant execute on function public.sensora_user_role() to authenticated;
grant execute on function public.sensora_is_admin() to authenticated;

grant select, insert, update, delete on public.sensora_profiles to authenticated;
grant select, insert, update, delete on public.sensora_clients to authenticated;

alter table public.sensora_profiles enable row level security;
alter table public.sensora_clients enable row level security;

 drop policy if exists sensora_profiles_read_self_or_admin on public.sensora_profiles;
create policy sensora_profiles_read_self_or_admin
  on public.sensora_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.sensora_is_admin()));

drop policy if exists sensora_profiles_admin_insert on public.sensora_profiles;
create policy sensora_profiles_admin_insert
  on public.sensora_profiles for insert to authenticated
  with check ((select public.sensora_is_admin()));

drop policy if exists sensora_profiles_admin_update on public.sensora_profiles;
create policy sensora_profiles_admin_update
  on public.sensora_profiles for update to authenticated
  using ((select public.sensora_is_admin()))
  with check ((select public.sensora_is_admin()));

drop policy if exists sensora_profiles_admin_delete on public.sensora_profiles;
create policy sensora_profiles_admin_delete
  on public.sensora_profiles for delete to authenticated
  using ((select public.sensora_is_admin()));

drop policy if exists sensora_clients_read_assigned on public.sensora_clients;
create policy sensora_clients_read_assigned
  on public.sensora_clients for select to authenticated
  using (
    (select public.sensora_is_admin())
    or commercial_user_id = (select auth.uid())
    or client_user_id = (select auth.uid())
  );

drop policy if exists sensora_clients_admin_insert on public.sensora_clients;
create policy sensora_clients_admin_insert
  on public.sensora_clients for insert to authenticated
  with check ((select public.sensora_is_admin()));

drop policy if exists sensora_clients_admin_update on public.sensora_clients;
create policy sensora_clients_admin_update
  on public.sensora_clients for update to authenticated
  using ((select public.sensora_is_admin()))
  with check ((select public.sensora_is_admin()));

drop policy if exists sensora_clients_admin_delete on public.sensora_clients;
create policy sensora_clients_admin_delete
  on public.sensora_clients for delete to authenticated
  using ((select public.sensora_is_admin()));

-- Provision users in Supabase Auth, then create their profile from the SQL Editor.
-- Never allow public sign-up to choose or change a role.
-- Example (replace with an Auth user UUID):
-- insert into public.sensora_profiles (user_id, role, full_name)
-- values ('00000000-0000-0000-0000-000000000000', 'administrador', 'Administrador');
-- Assign clients by setting commercial_user_id and client_user_id to profile user IDs.
