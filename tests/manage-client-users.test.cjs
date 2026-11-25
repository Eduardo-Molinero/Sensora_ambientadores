const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/manage-client-users/index.js'), 'utf8')
  .replace("import { createClient } from 'npm:@supabase/supabase-js@2';", 'const createClient = globalThis.createClient;');

function createHarness(role, options = {}) {
  const calls = [];
  let handler;
  const userId = '11111111-1111-4111-8111-111111111111';
  const createdId = '22222222-2222-4222-8222-222222222222';
  const clientId = '33333333-3333-4333-8333-333333333333';
  const existing = { id: clientId, name: 'Empresa', company_name: '', contact_name: '', email: 'old@example.com', phone: '', city: '', status: 'Activa', commercial_user_id: null, client_user_id: createdId };
  if (options.unlinked) existing.client_user_id = null;

  const admin = {
    auth: {
      getUser: async () => ({ data: { user: role ? { id: userId } : null }, error: role ? null : new Error('invalid') }),
      admin: {
        createUser: async (input) => { calls.push(['createUser', input.email]); return { data: { user: { id: createdId } }, error: null }; },
        deleteUser: async (id) => { calls.push(['deleteUser', id]); return { error: null }; },
        getUserById: async () => ({ data: { user: { email: 'old@example.com' } }, error: null }),
        updateUserById: async (id, fields) => { calls.push(['updateUserById', id, fields]); return { error: options.authError ? new Error('auth') : null }; },
      },
    },
    from(table) {
      const state = { operation: 'select', filters: {} };
      const builder = {
        select() { return builder; },
        eq(field, value) { state.filters[field] = value; return builder; },
        is(field, value) { state.filters[field] = value; return builder; },
        insert(fields) { state.operation = 'insert'; calls.push(['insert', table, fields]); return table === 'sensora_profiles' ? Promise.resolve({ error: options.profileError ? new Error('profile') : null }) : builder; },
        update(fields) { state.operation = 'update'; calls.push(['update', table, fields]); return builder; },
        maybeSingle: async () => {
          if (table === 'sensora_profiles') return { data: { role: state.filters.user_id === userId ? role : options.targetRole || 'cliente' }, error: null };
          if (state.operation === 'select') return { data: existing, error: null };
          return { data: { id: clientId }, error: null };
        },
        then(resolve) { resolve({ error: null }); },
      };
      return builder;
    },
  };

  const sandbox = { createClient: () => admin, Request, Response, JSON, Error, Deno: { env: { get: () => 'configured' }, serve: (fn) => { handler = fn; } } };
  vm.runInNewContext(source, sandbox, { filename: 'manage-client-users/index.js' });
  const invoke = async (payload, authorized = true) => {
    const request = new Request('https://example.test', { method: 'POST', headers: authorized ? { Authorization: 'Bearer test' } : {}, body: JSON.stringify(payload) });
    const response = await handler(request);
    return { status: response.status, body: await response.json() };
  };
  return { invoke, calls, clientId, createdId };
}

const valid = { action: 'create', name: 'Empresa', email: 'new@example.com', password: 'long-password-123', companyName: '', contactName: '', phone: '', city: '', commercialId: '' };

test('rejects anonymous and client callers before any account mutation', async () => {
  const anonymous = createHarness(null);
  assert.equal((await anonymous.invoke(valid, false)).status, 401);
  const client = createHarness('cliente');
  assert.equal((await client.invoke(valid)).status, 403);
  assert.equal(client.calls.length, 0);
});

test('creates a client profile and linked record for an administrator', async () => {
  const harness = createHarness('administrador');
  assert.equal((await harness.invoke(valid)).status, 200);
  assert.equal(harness.calls[0][0], 'createUser');
  assert.equal(harness.calls[1][1], 'sensora_profiles');
  assert.equal(harness.calls[1][2].role, 'cliente');
  assert.equal(harness.calls[2][1], 'sensora_clients');
  assert.equal(harness.calls[2][2].client_user_id, harness.createdId);
});

test('cleans up an account if the profile cannot be created', async () => {
  const harness = createHarness('administrador', { profileError: true });
  assert.equal((await harness.invoke(valid)).status, 409);
  assert.equal(harness.calls.some((call) => call[0] === 'deleteUser' && call[1] === harness.createdId), true);
});

test('links an access to an existing client instead of creating another record', async () => {
  const harness = createHarness('administrador', { unlinked: true });
  assert.equal((await harness.invoke({ ...valid, clientId: harness.clientId })).status, 200);
  assert.equal(harness.calls.some((call) => call[0] === 'update' && call[1] === 'sensora_clients' && call[2].client_user_id === harness.createdId), true);
  assert.equal(harness.calls.some((call) => call[0] === 'insert' && call[1] === 'sensora_clients'), false);
});

test('refuses to create a second access for a linked client', async () => {
  const harness = createHarness('administrador');
  assert.equal((await harness.invoke({ ...valid, clientId: harness.clientId })).status, 409);
  assert.equal(harness.calls.some((call) => call[0] === 'createUser'), false);
});

test('rejects weak passwords and protects non-client accounts', async () => {
  const weak = createHarness('administrador');
  assert.equal((await weak.invoke({ ...valid, password: 'short' })).status, 400);
  assert.equal(weak.calls.length, 0);
  const protectedAccount = createHarness('administrador', { targetRole: 'administrador' });
  assert.equal((await protectedAccount.invoke({ action: 'delete', clientId: protectedAccount.clientId })).status, 403);
  assert.equal(protectedAccount.calls.length, 0);
});

test('restores client details when an Auth update fails', async () => {
  const harness = createHarness('administrador', { authError: true });
  const result = await harness.invoke({ ...valid, action: 'update', clientId: harness.clientId });
  assert.equal(result.status, 409);
  const updates = harness.calls.filter((call) => call[0] === 'update' && call[1] === 'sensora_clients');
  assert.equal(updates.length, 2);
  assert.equal(updates[1][2].email, 'old@example.com');
});

test('deletes only the client access, preserving its record', async () => {
  const harness = createHarness('administrador');
  assert.equal((await harness.invoke({ action: 'delete', clientId: harness.clientId })).status, 200);
  assert.equal(harness.calls.some((call) => call[0] === 'deleteUser' && call[1] === harness.createdId), true);
  assert.equal(harness.calls.some((call) => call[0] === 'delete' && call[1] === 'sensora_clients'), false);
});