# Inicio de sesión y clientes en Supabase

La aplicación usa el proyecto existente SENSORA-BUSINESS. No crea otro proyecto ni incluye una clave `service_role`.

## Activación

1. Revisa y ejecuta `supabase/migrations/20261118_001_sensora_profiles_and_clients.sql` en el SQL Editor del proyecto. La migración solo añade `sensora_profiles` y `sensora_clients`, habilita RLS y no modifica las tablas existentes.
2. En Supabase Auth, invita o crea cada cuenta con correo y contraseña. No hay registro público desde la app.
3. En el SQL Editor, asigna un perfil por usuario usando el UUID de Auth:

```sql
insert into public.sensora_profiles (user_id, role, full_name)
values ('UUID_DEL_USUARIO', 'administrador', 'Nombre');
```

Los roles permitidos son `administrador`, `comercial` y `cliente`. El primer administrador debe quedar provisionado por el propietario del proyecto desde el SQL Editor.

4. Crea clientes en `sensora_clients`. Asigna `commercial_user_id` y `client_user_id` usando UUIDs de usuarios que ya tengan sus perfiles.
5. Completa `.env` con la URL del proyecto y su clave pública (anon/publishable), usando `.env.example` como plantilla. Nunca pongas una clave `service_role` en una variable `EXPO_PUBLIC_*` ni la compartas por el chat.
6. Reinicia Expo. Si no hay URL y clave configuradas, las entradas siguen siendo de demostración local.

## Alcance actual

El login real comprueba el rol de `sensora_profiles` después de autenticar con Supabase. RLS limita la lectura de `sensora_clients` al administrador, comercial asignado o cliente vinculado. Las pantallas de instalaciones y solicitudes aún muestran los datos demo existentes; conectar esas listas requiere revisar las tablas reales de instalaciones y solicitudes antes de añadir más cambios al esquema.
