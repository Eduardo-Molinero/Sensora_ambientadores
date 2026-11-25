grant select, insert on public.sensora_profiles to service_role;
grant select, insert, update on public.sensora_clients to service_role;

create or replace function public.sensora_admin_client_accounts()
returns table (
  id uuid,
  name text,
  company_name text,
  contact_name text,
  email text,
  auth_email text,
  phone text,
  city text,
  status text,
  commercial_user_id uuid,
  client_user_id uuid
)
language sql stable security definer set search_path = '' as $$
  select client.id, client.name, client.company_name, client.contact_name,
    client.email, coalesce(account.email, ''), client.phone, client.city,
    client.status, client.commercial_user_id, client.client_user_id
  from public.sensora_clients as client
  left join public.sensora_profiles as profile on profile.user_id = client.client_user_id
  left join auth.users as account on account.id = client.client_user_id
  where (select public.sensora_is_admin())
    and (client.client_user_id is null or profile.role = 'cliente')
  order by client.name, client.id;
$$;

revoke all on function public.sensora_admin_client_accounts() from public, anon;
grant execute on function public.sensora_admin_client_accounts() to authenticated;