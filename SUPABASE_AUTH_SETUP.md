# Inicio de sesión y clientes en Supabase

La aplicación usa el proyecto existente SENSORA-BUSINESS. No crea otro proyecto ni incluye una clave `service_role`.

## Activación

1. Revisa y ejecuta en orden `supabase/migrations/20261118_001_sensora_profiles_and_clients.sql` y `supabase/migrations/20261123_002_sensora_installations.sql` en el SQL Editor del proyecto. Son migraciones aditivas: crean las tablas de perfiles, clientes e instalaciones con RLS, sin modificar ni eliminar las tablas existentes.
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
where email = 'cliente.pruebas@sensora.com'
on conflict (user_id) do update set role = excluded.role, full_name = excluded.full_name;
```

Los roles permitidos son `administrador`, `comercial` y `cliente`. El primer administrador debe quedar provisionado por el propietario del proyecto desde el SQL Editor.

4. Crea clientes en `sensora_clients`. Asigna `commercial_user_id` y `client_user_id` usando UUIDs de usuarios que ya tengan sus perfiles.
5. Crea `.env` a partir de `.env.example` y complétalo con la URL del proyecto y su clave pública (anon/publishable). `.env` está excluido de Git. Nunca pongas una clave `service_role` en una variable `EXPO_PUBLIC_*` ni la compartas por el chat.
6. Reinicia Expo. Si no hay URL y clave configuradas, las entradas siguen siendo de demostración local.

## Alcance actual

El login real comprueba el rol de `sensora_profiles` después de autenticar con Supabase. RLS limita la lectura de clientes e instalaciones al administrador, comercial asignado o cliente vinculado. Las nuevas instalaciones se guardan en `sensora_installations` y son creadas por el comercial asignado.

## Pedidos de aromas

Ejecuta las migraciones de pedidos `003`, `004`, `005` y `006` en orden en el SQL Editor del proyecto, después de las migraciones anteriores. El stock inicial es cero para evitar mostrar existencias inventadas. El administrador debe registrar las unidades reales desde **Menú > Catálogo** para habilitar pedidos.

Cada pedido requiere una indicación de dónde colocar el ambientador, reserva una unidad y genera una notificación para el comercial asignado. Sin ubicación, stock o comercial asignado, el pedido no se crea. Los pedidos antiguos conservan su instalación, si tenían una. Las notificaciones se actualizan en el panel comercial mientras la aplicación está abierta; no son notificaciones push del dispositivo.

## Gestión de accesos de clientes

Ejecuta `supabase/migrations/20261125_007_admin_client_accounts.sql` y despliega la función `supabase/functions/manage-client-users` en el mismo proyecto. La función usa la clave de servicio proporcionada al entorno de Supabase y verifica la sesión y el rol de administrador en cada solicitud. Nunca incluyas esa clave en la aplicación web ni en variables `EXPO_PUBLIC_*`.

En **Administrador > Más > Configuración** se pueden crear accesos para clientes nuevos o existentes, editar sus datos y eliminar el acceso. Eliminar un acceso conserva la ficha, instalaciones y pedidos del cliente. El teléfono es de contacto, no habilita el acceso por SMS. Los correos se confirman al crear o cambiar el acceso y las contraseñas no se envían automáticamente: el administrador debe verificar el correo y facilitar la contraseña por un canal seguro.

Las cuentas de prueba no son adecuadas para producción. Cambia las contraseñas débiles, especialmente la del administrador. La aplicación todavía no incluye un desafío MFA, por lo que hay que implementarlo antes de exigir MFA para el acceso administrativo.
