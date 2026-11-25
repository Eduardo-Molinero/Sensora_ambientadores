alter table public.sensora_fragrance_orders
  add column if not exists installation_id uuid references public.sensora_installations (id) on delete set null;

create or replace function public.sensora_order_fragrance(requested_name text, requested_installation_id uuid)
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

  if not exists (
    select 1 from public.sensora_installations
    where id = requested_installation_id and client_id = assigned_client.id
  ) then
    raise exception 'Selecciona una instalación que pertenezca a tu cuenta.';
  end if;

  update public.sensora_fragrance_stock set quantity = quantity - 1
    where name = requested_name and quantity > 0;
  if not found then
    raise exception 'Este aroma no tiene stock disponible.';
  end if;

  insert into public.sensora_fragrance_orders (client_id, commercial_user_id, fragrance_name, installation_id)
    values (assigned_client.id, assigned_client.commercial_user_id, requested_name, requested_installation_id);
end;
$$;

create or replace function public.sensora_order_fragrance(requested_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Actualiza la aplicación y selecciona una instalación para pedir el aroma.';
end;
$$;

revoke all on function public.sensora_order_fragrance(text, uuid) from public, anon;
grant execute on function public.sensora_order_fragrance(text, uuid) to authenticated;