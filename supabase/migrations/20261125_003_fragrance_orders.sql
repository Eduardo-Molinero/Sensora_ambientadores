create table if not exists public.sensora_fragrance_stock (
  name text primary key,
  quantity integer not null default 0 check (quantity >= 0)
);

insert into public.sensora_fragrance_stock (name)
values ('Coco'), ('Vainilla'), ('Menta'), ('Canela'), ('Melón'), ('Chupa Chups')
on conflict (name) do nothing;

create table if not exists public.sensora_fragrance_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.sensora_clients (id),
  commercial_user_id uuid not null references public.sensora_profiles (user_id),
  fragrance_name text not null references public.sensora_fragrance_stock (name),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists sensora_fragrance_orders_commercial_idx
  on public.sensora_fragrance_orders (commercial_user_id, created_at desc);

alter table public.sensora_fragrance_stock enable row level security;
alter table public.sensora_fragrance_orders enable row level security;
grant select on public.sensora_fragrance_stock, public.sensora_fragrance_orders to authenticated;
grant update on public.sensora_fragrance_stock to authenticated;

create policy sensora_fragrance_stock_read on public.sensora_fragrance_stock
  for select to authenticated using (true);
create policy sensora_fragrance_stock_admin_update on public.sensora_fragrance_stock
  for update to authenticated using ((select public.sensora_is_admin()))
  with check ((select public.sensora_is_admin()));
create policy sensora_fragrance_orders_read on public.sensora_fragrance_orders
  for select to authenticated using (
    (select public.sensora_is_admin())
    or commercial_user_id = (select auth.uid())
    or exists (select 1 from public.sensora_clients as client
      where client.id = client_id and client.client_user_id = (select auth.uid()))
  );

create or replace function public.sensora_order_fragrance(requested_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  assigned_client public.sensora_clients%rowtype;
begin
  if public.sensora_user_role() is distinct from 'cliente' then
    raise exception 'Solo los clientes pueden pedir aromas.';
  end if;

  select * into assigned_client from public.sensora_clients
    where client_user_id = auth.uid();
  if not found or assigned_client.commercial_user_id is null then
    raise exception 'No tienes un comercial asignado.';
  end if;

  update public.sensora_fragrance_stock set quantity = quantity - 1
    where name = requested_name and quantity > 0;
  if not found then
    raise exception 'Este aroma no tiene stock disponible.';
  end if;

  insert into public.sensora_fragrance_orders (client_id, commercial_user_id, fragrance_name)
    values (assigned_client.id, assigned_client.commercial_user_id, requested_name);
end;
$$;

create or replace function public.sensora_mark_fragrance_orders_read(order_ids uuid[])
returns void language sql security definer set search_path = '' as $$
  update public.sensora_fragrance_orders set read_at = now()
  where id = any(order_ids) and commercial_user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.sensora_order_fragrance(text) from public, anon;
revoke all on function public.sensora_mark_fragrance_orders_read(uuid[]) from public, anon;
grant execute on function public.sensora_order_fragrance(text) to authenticated;
grant execute on function public.sensora_mark_fragrance_orders_read(uuid[]) to authenticated;