-- Add installation records without altering existing tables.
create table if not exists public.sensora_installations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.sensora_clients (id) on delete cascade,
  location_name text not null,
  floor_number text not null default '',
  room_number text not null default '',
  product_name text not null default 'Ambientador',
  scent text not null default '',
  status text not null default 'Activa' check (status in ('Activa', 'Pendiente', 'Revisión')),
  created_by uuid not null references public.sensora_profiles (user_id),
  created_at timestamptz not null default now()
);

create index if not exists sensora_installations_client_id_idx
  on public.sensora_installations (client_id);

create index if not exists sensora_installations_created_by_idx
  on public.sensora_installations (created_by);

grant select, insert, update, delete on public.sensora_installations to authenticated;
alter table public.sensora_installations enable row level security;

drop policy if exists sensora_installations_read_assigned on public.sensora_installations;
create policy sensora_installations_read_assigned
  on public.sensora_installations for select to authenticated
  using (
    (select public.sensora_is_admin())
    or exists (
      select 1
      from public.sensora_clients as client
      where client.id = sensora_installations.client_id
        and (
          client.commercial_user_id = (select auth.uid())
          or client.client_user_id = (select auth.uid())
        )
    )
  );

drop policy if exists sensora_installations_insert_assigned on public.sensora_installations;
create policy sensora_installations_insert_assigned
  on public.sensora_installations for insert to authenticated
  with check (
    (select public.sensora_is_admin())
    or (
      created_by = (select auth.uid())
      and exists (
        select 1
        from public.sensora_clients as client
        where client.id = sensora_installations.client_id
          and client.commercial_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists sensora_installations_update_assigned on public.sensora_installations;
create policy sensora_installations_update_assigned
  on public.sensora_installations for update to authenticated
  using (
    (select public.sensora_is_admin())
    or exists (
      select 1
      from public.sensora_clients as client
      where client.id = sensora_installations.client_id
        and client.commercial_user_id = (select auth.uid())
    )
  )
  with check (
    (select public.sensora_is_admin())
    or exists (
      select 1
      from public.sensora_clients as client
      where client.id = sensora_installations.client_id
        and client.commercial_user_id = (select auth.uid())
    )
  );

drop policy if exists sensora_installations_delete_assigned on public.sensora_installations;
create policy sensora_installations_delete_assigned
  on public.sensora_installations for delete to authenticated
  using (
    (select public.sensora_is_admin())
    or exists (
      select 1
      from public.sensora_clients as client
      where client.id = sensora_installations.client_id
        and client.commercial_user_id = (select auth.uid())
    )
  );
