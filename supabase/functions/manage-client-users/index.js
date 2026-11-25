import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const clientFields = 'id, name, company_name, contact_name, email, phone, city, status, commercial_user_id, client_user_id';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply(503, { error: 'La gestión de usuarios no está configurada.' });

  const bearer = request.headers.get('Authorization') ?? '';
  if (!bearer.startsWith('Bearer ')) return reply(401, { error: 'Inicia sesión de nuevo.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: identityError } = await admin.auth.getUser(bearer.slice(7));
  if (identityError || !identity.user) return reply(401, { error: 'La sesión ha caducado.' });
  const { data: caller, error: callerError } = await admin.from('sensora_profiles')
    .select('role').eq('user_id', identity.user.id).maybeSingle();
  if (callerError) return reply(503, { error: 'No se pudo verificar el acceso.' });
  if (caller?.role !== 'administrador') return reply(403, { error: 'Acceso reservado al administrador.' });

  let input;
  try { input = await request.json(); } catch { return reply(400, { error: 'Datos inválidos.' }); }
  if (!input || typeof input !== 'object') return reply(400, { error: 'Datos inválidos.' });
  const action = input.action;
  const clientId = typeof input.clientId === 'string' ? input.clientId : '';
  if (!['create', 'update', 'delete'].includes(action)) return reply(400, { error: 'Operación no válida.' });
  if (clientId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
    return reply(400, { error: 'Cliente no válido.' });
  }
  if (action !== 'create' && !clientId) return reply(400, { error: 'Selecciona un cliente.' });

  let existing = null;
  if (clientId) {
    const result = await admin.from('sensora_clients').select(clientFields).eq('id', clientId).maybeSingle();
    if (result.error) return reply(503, { error: 'No se pudo consultar el cliente.' });
    existing = result.data;
    if (!existing) return reply(404, { error: 'El cliente ya no existe.' });
  }

  if (action === 'delete') {
    if (!existing?.client_user_id) return reply(409, { error: 'Este cliente no tiene una cuenta activa.' });
    const { data: target, error: targetError } = await admin.from('sensora_profiles')
      .select('role').eq('user_id', existing.client_user_id).maybeSingle();
    if (targetError || target?.role !== 'cliente') return reply(403, { error: 'Solo se pueden eliminar accesos de cliente.' });
    const { error } = await admin.auth.admin.deleteUser(existing.client_user_id);
    if (error) return reply(409, { error: 'No se pudo eliminar el acceso. Los datos del cliente permanecen intactos.' });
    return reply(200, { ok: true });
  }

  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const name = text(input.name);
  const companyName = text(input.companyName);
  const contactName = text(input.contactName);
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone);
  const city = text(input.city);
  const password = typeof input.password === 'string' ? input.password : '';
  const commercialId = text(input.commercialId);
  if (!name || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      companyName.length > 150 || contactName.length > 150 || phone.length > 40 || city.length > 100) {
    return reply(400, { error: 'Revisa el nombre, correo y datos del cliente.' });
  }
  if ((action === 'create' || password) && (password.length < 12 || password.length > 72)) {
    return reply(400, { error: 'La contraseña debe tener entre 12 y 72 caracteres.' });
  }
  if (commercialId) {
    const { data: commercial, error } = await admin.from('sensora_profiles')
      .select('role').eq('user_id', commercialId).maybeSingle();
    if (error || commercial?.role !== 'comercial') return reply(400, { error: 'Selecciona un comercial válido.' });
  }
  const fields = { name, company_name: companyName, contact_name: contactName, email, phone, city, commercial_user_id: commercialId || null };

  if (action === 'create') {
    if (existing?.client_user_id) return reply(409, { error: 'Este cliente ya tiene una cuenta activa.' });
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError || !created.user) return reply(409, { error: 'No se pudo crear el acceso. Comprueba que el correo no esté registrado.' });
    const userId = created.user.id;
    const { error: profileError } = await admin.from('sensora_profiles').insert({ user_id: userId, role: 'cliente', full_name: contactName || name });
    let clientError = profileError;
    if (!clientError) {
      const result = existing
        ? await admin.from('sensora_clients').update({ ...fields, client_user_id: userId }).eq('id', clientId).is('client_user_id', null).select('id').maybeSingle()
        : await admin.from('sensora_clients').insert({ ...fields, client_user_id: userId }).select('id').maybeSingle();
      clientError = result.error || (!result.data ? new Error('El cliente ya tiene acceso.') : null);
    }
    if (clientError) {
      const cleanup = await admin.auth.admin.deleteUser(userId);
      if (cleanup.error) return reply(500, { error: 'No se completó el alta y no se pudo retirar la cuenta incompleta. Contacta con soporte.' });
      return reply(409, { error: 'No se pudo vincular la cuenta al cliente. No se creó el acceso.' });
    }
    return reply(200, { ok: true });
  }

  if (!existing?.client_user_id) {
    if (password) return reply(409, { error: 'Crea primero un acceso para asignar una contraseña.' });
    const result = await admin.from('sensora_clients').update(fields).eq('id', clientId)
      .is('client_user_id', null).select('id').maybeSingle();
    if (result.error || !result.data) return reply(409, { error: 'No se pudo actualizar el cliente.' });
    return reply(200, { ok: true });
  }
  const { data: target, error: targetError } = await admin.from('sensora_profiles')
    .select('role').eq('user_id', existing.client_user_id).maybeSingle();
  if (targetError || target?.role !== 'cliente') return reply(403, { error: 'Solo se pueden modificar accesos de cliente.' });
  const { data: account, error: accountError } = await admin.auth.admin.getUserById(existing.client_user_id);
  if (accountError || !account.user) return reply(409, { error: 'No se pudo consultar el acceso del cliente.' });
  const { data: changed, error: updateError } = await admin.from('sensora_clients').update(fields)
    .eq('id', clientId).eq('client_user_id', existing.client_user_id).select('id').maybeSingle();
  if (updateError || !changed) return reply(409, { error: 'No se pudo actualizar el cliente.' });
  const authChanges = { ...(email !== account.user.email?.toLowerCase() ? { email, email_confirm: true } : {}), ...(password ? { password } : {}) };
  const authError = Object.keys(authChanges).length
    ? (await admin.auth.admin.updateUserById(existing.client_user_id, authChanges)).error
    : null;
  if (authError) {
    const rollback = await admin.from('sensora_clients').update({
      name: existing.name, company_name: existing.company_name, contact_name: existing.contact_name,
      email: existing.email, phone: existing.phone, city: existing.city, commercial_user_id: existing.commercial_user_id,
    }).eq('id', clientId).eq('client_user_id', existing.client_user_id);
    return reply(409, { error: rollback.error ? 'No se pudo actualizar el acceso ni restaurar la ficha. Revisa los datos.' : 'No se pudo actualizar el acceso. Comprueba el correo y la contraseña.' });
  }
  return reply(200, { ok: true });
});