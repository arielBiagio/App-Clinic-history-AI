import { createClientAuthorizer, createOAuthClientLookup, type ClientPolicy } from '../oauth-clients.ts'

const id = 'e7fa3a4e-a516-447a-ae0a-ce31d91ce0a3'
const callback = 'https://sesameai.app/api/oauth/external-mcp/callback'
const policy: ClientPolicy = { supabaseUrl: 'https://project.example', clientIds: [], trustedPublicRedirectUris: [callback] }
const registered = { client_id: id, client_type: 'public', token_endpoint_auth_method: 'none', registration_type: 'dynamic', redirect_uris: [callback], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }
const assert = (ok: unknown, message = 'assertion failed') => { if (!ok) throw new Error(message) }

Deno.test('autoriza un nuevo ID DCR público por su callback exacto registrado, no por nombre', async () => {
  let calls = 0
  const authorize = createClientAuthorizer(policy, async clientId => { calls++; assert(clientId === id); return { ...registered, client_name: 'no se usa' } })
  assert(await authorize(id), 'El nuevo cliente DCR de Sesame debe poder conectarse')
  assert(calls === 1)
})

Deno.test('deniega metadatos OAuth maliciosos, ambiguos o incompletos', async () => {
  for (const patch of [
    { client_id: '11111111-1111-4111-8111-111111111111' },
    { client_type: 'confidential' }, { token_endpoint_auth_method: 'client_secret_post' },
    { token_endpoint_auth_method: undefined }, { registration_type: 'manual' },
    { redirect_uris: [] }, { redirect_uris: undefined }, { redirect_uris: callback },
    { redirect_uris: [callback, 'https://attacker.example/callback'] },
    { redirect_uris: [callback + '/'] }, { redirect_uris: [callback + '?next=evil'] },
    { redirect_uris: ['https://sesameai.app.attacker.example/api/oauth/external-mcp/callback'] },
    { redirect_uris: ['http://sesameai.app/api/oauth/external-mcp/callback'] },
    { redirect_uris: ['https://attacker.example'], client_name: 'Sesame' },
    { grant_types: ['client_credentials'] }, { response_types: ['token'] },
  ]) {
    const authorize = createClientAuthorizer(policy, async () => ({ ...registered, ...patch }))
    assert(!await authorize(id), JSON.stringify(patch))
  }
  for (const value of [null, [], 'Sesame', { data: registered }]) {
    assert(!await createClientAuthorizer(policy, async () => value)(id))
  }
})

Deno.test('solo consulta IDs UUID y solo con callback HTTPS configurado', async () => {
  let calls = 0
  const lookup = async () => { calls++; return registered }
  for (const clientId of [undefined, null, '', 'sesame', '../clients', 'https://attacker.example', 123]) {
    assert(!await createClientAuthorizer(policy, lookup)(clientId))
  }
  for (const uris of [undefined, [], ['*'], ['http://sesameai.app/callback'], ['https://user:pass@sesameai.app/callback'], [callback + '#fragment']]) {
    assert(!await createClientAuthorizer({ ...policy, trustedPublicRedirectUris: uris }, lookup)(id))
  }
  assert(calls === 0)
})

Deno.test('fallos del registro cierran acceso y no se cachea una autorización', async () => {
  const unavailable = createClientAuthorizer(policy, async () => { throw new Error('timeout / unavailable') })
  assert(!await unavailable(id))
  let current: unknown = registered
  const authorize = createClientAuthorizer(policy, async () => current)
  assert(await authorize(id))
  current = null
  assert(!await authorize(id), 'Un cliente eliminado no puede reutilizar autorización cacheada')
})

Deno.test('allowlist explícita sigue funcionando sin registro y política vacía deniega', async () => {
  let calls = 0
  const lookup = async () => { calls++; throw new Error('No debe consultarse') }
  assert(await createClientAuthorizer({ ...policy, clientIds: [id] }, lookup)(id))
  assert(!await createClientAuthorizer({ supabaseUrl: policy.supabaseUrl, clientIds: [] }, lookup)(id))
  assert(calls === 0)
  // No admin credential: no fallback anonymous lookup, even with a trusted callback.
  assert(!await createClientAuthorizer(policy)(id))
})

Deno.test('lookup administrativo solo usa GET a Auth con timeout y sin redirecciones', async () => {
  let calls = 0
  const request: typeof fetch = async (input, init) => {
    calls++
    assert(String(input) === `https://project.example/auth/v1/admin/oauth/clients/${id}`)
    assert(init?.method === 'GET' && init.redirect === 'error' && init.cache === 'no-store')
    assert(init?.signal instanceof AbortSignal)
    const headers = new Headers(init?.headers)
    assert(headers.get('apikey') === 'fake-server-only-key')
    assert(headers.get('Authorization') === 'Bearer fake-server-only-key')
    return Response.json(registered)
  }
  const lookup = createOAuthClientLookup(policy.supabaseUrl + '/', 'fake-server-only-key', request)
  assert(await lookup('../clients') === null && calls === 0)
  assert((await lookup(id) as typeof registered).client_id === id && calls === 1)
  assert(await createClientAuthorizer(policy, lookup)(id))
})

Deno.test('HTTP 404/500, timeout o JSON inválido del registro nunca habilitan el cliente', async () => {
  for (const request of [
    async () => new Response(null, { status: 404 }),
    async () => new Response(null, { status: 500 }),
    async () => new Response('not json'),
    async () => { throw new DOMException('Timed out', 'TimeoutError') },
  ]) {
    const lookup = createOAuthClientLookup(policy.supabaseUrl, 'fake-server-only-key', request)
    assert(!await createClientAuthorizer(policy, lookup)(id))
  }
})
