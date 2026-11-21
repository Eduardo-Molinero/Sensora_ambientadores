# Inicio de sesión y clientes en Supabase

La aplicación usa el proyecto existente SENSORA-BUSINESS. No crea otro proyecto ni incluye una clave `service_role`.

## Activación

1. Revisa y ejecuta `supabase/migrations/20261118_001_sensora_profiles_and_clients.sql` en el SQL Editor del proyecto. La migración solo añade `sensora_profiles` y `sensora_clients`, habilita RLS y no modifica las tablas existentes.
2. En **Authentication > Users**, crea las cuentas de `TEST_CREDENTIALS.md` con sus contraseñas y confirma los emails si el proyecto lo requiere. No hay registro público desde la app.
3. En el SQL Editor, ejecuta esto para asignar el rol a cada usuario creado:

```sql
insert into public.sensora_profiles (user_id, role, full_name)
select id, 'administrador', 'Administrador de prueba'
from auth.users
where email = 'admin.pruebas@sensora.test'
on conflict (user_id) do update set role = excluded.role, full_name = excluded.full_name;

insert into public.sensora_profiles (user_id, role, full_name)
select id, 'comercial', 'Comercial de prueba'
from auth.users
where email = 'comercial.pruebas@sensora.test'
on conflict (user_id) do update set role = excluded.role, full_name = excluded.full_name;

insert into public.sensora_profiles (user_id, role, full_name)
select id, 'cliente', 'Cliente de prueba'
from auth.users
where email = 'cliente.pruebas@sensora.test'
on conflict (user_id) do update set role = excluded.role, full_name = excluded.full_name;
```

Los roles permitidos son `administrador`, `comercial` y `cliente`. El primer administrador debe quedar provisionado por el propietario del proyecto desde el SQL Editor.

4. Crea clientes en `sensora_clients`. Asigna `commercial_user_id` y `client_user_id` usando UUIDs de usuarios que ya tengan sus perfiles.
5. Crea `.env` a partir de `.env.example` y complétalo con la URL del proyecto y su clave pública (anon/publishable). `.env` está excluido de Git. Nunca pongas una clave `service_role` en una variable `EXPO_PUBLIC_*` ni la compartas por el chat.
6. Reinicia Expo. Si no hay URL y clave configuradas, las entradas siguen siendo de demostración local.

## Alcance actual

El login real comprueba el rol de `sensora_profiles` después de autenticar con Supabase. RLS limita la lectura de `sensora_clients` al administrador, comercial asignado o cliente vinculado. Las pantallas de instalaciones y solicitudes aún muestran los datos demo existentes; conectar esas listas requiere revisar las tablas reales de instalaciones y solicitudes antes de añadir más cambios al esquema.
