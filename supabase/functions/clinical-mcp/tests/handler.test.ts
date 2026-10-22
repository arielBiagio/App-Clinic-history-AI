import { createHandler, type Config } from '../handler.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

const config: Config = { supabaseUrl: 'https://project.example', anonKey: 'test', resourceUrl: 'https://project.example/functions/v1/clinical-mcp', clientIds: ['sesame-test'], origins: ['https://app.example'] }
const valid = { iss: 'https://project.example/auth/v1', aud: 'authenticated', sub: '11111111-1111-4111-8111-111111111111', role: 'authenticated', exp: Date.now() / 1000 + 3600, client_id: 'sesame-test' }
const assert = (ok: unknown, message = 'assertion failed') => { if (!ok) throw new Error(message) }
function mockDb(data: unknown[] = []) {
  const calls: { name: string; args: unknown[] }[] = []
  let single = false
  const chain = new Proxy({}, { get(_target, key) {
    if (key === 'then') return (resolve: (value: unknown) => void) => resolve({ data: single ? data[0] ?? null : data, error: null })
    return (...args: unknown[]) => { if (key === 'from') single = false; if (key === 'maybeSingle') single = true; calls.push({ name: String(key), args }); return chain }
  } })
  return { db: chain as SupabaseClient, calls }
}
function setup(claims: Record<string, unknown> = valid, data: unknown[] = []) {
  const { db, calls } = mockDb(data)
  return { handle: createHandler(config, async token => token === 'valid' ? { claims, db } : null), calls }
}
function req(body: unknown, token = 'valid') {
  return new Request(config.resourceUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify(body) })
}
async function rpc(handle: (req: Request) => Promise<Response>, method: string, params?: unknown) {
  const response = await handle(req({ jsonrpc: '2.0', id: 1, method, params }))
  const text = await response.text()
  const data = text.includes('data: ') ? text.split('\n').find(line => line.startsWith('data: '))!.slice(6) : text
  return { response, body: JSON.parse(data) }
}

Deno.test('metadata pública y desafío OAuth sin acceso a datos', async () => {
  const { handle, calls } = setup()
  const response = await handle(req({}, 'invalid'))
  assert(response.status === 401)
  const match = response.headers.get('WWW-Authenticate')!.match(/resource_metadata="([^"]+)"/)!
  const metadata = await handle(new Request(match[1]))
  assert(metadata.status === 200)
  assert((await metadata.json()).resource === config.resourceUrl)
  assert(calls.length === 0)
})
Deno.test('discovery funciona cuando el gateway elimina /functions/v1', async () => {
  const { handle, calls } = setup()
  const response = await handle(new Request('https://runtime.example/clinical-mcp', { method: 'POST' }))
  assert(response.status === 401)
  const metadata = await handle(new Request('https://runtime.example/clinical-mcp/.well-known/oauth-protected-resource'))
  assert(metadata.status === 200)
  assert((await metadata.json()).resource === config.resourceUrl)
  assert(calls.length === 0)
})
Deno.test('historia pagina, conserva null y excluye metadatos del contenido clínico', async () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const { handle, calls } = setup(valid, [{ id, created_at: '2026-10-22', contenido: { edad: 0, diagnostico: null, _meta: { secret: 'hidden' } } }])
  const { body } = await rpc(handle, 'tools/call', { name: 'leer_historia_clinica', arguments: { paciente_id: id, limite: 1 } })
  const result = JSON.parse(body.result.content[0].text)
  assert(result.consultas[0].contenido.edad === 0)
  assert(result.consultas[0].contenido.diagnostico === null)
  assert(!('_meta' in result.consultas[0].contenido))
  assert(result.siguiente_pagina === null)
  assert(calls.some(c => c.name === 'eq' && c.args[0] === 'paciente_id' && c.args[1] === id))
})
Deno.test('paciente no accesible corta antes de consultar sus evaluaciones', async () => {
  const { handle, calls } = setup()
  const { body } = await rpc(handle, 'tools/call', { name: 'leer_historia_clinica', arguments: { paciente_id: '11111111-1111-4111-8111-111111111111' } })
  assert(body.result.isError)
  assert(!calls.some(c => c.name === 'from' && c.args[0] === 'evaluaciones'))
})
Deno.test('búsqueda clínica usa campo permitido y devuelve solo la coincidencia', async () => {
  const { handle, calls } = setup(valid, [{ id: 'consulta', paciente_id: 'paciente', contenido: { diagnostico: 'Tendinopatía', antecedentes: 'no exportar aquí' } }])
  const { body } = await rpc(handle, 'tools/call', { name: 'buscar_consultas', arguments: { texto: 'Tendinopatía' } })
  const result = JSON.parse(body.result.content[0].text)
  assert(result.consultas[0].coincidencia === 'Tendinopatía')
  assert(!JSON.stringify(result).includes('no exportar aquí'))
  assert(calls.some(c => c.name === 'ilike' && c.args[0] === 'contenido->>diagnostico'))
})
Deno.test('rechaza tokens expirados, otro issuer, audiencia, rol o cliente y sesiones no OAuth', async () => {
  for (const patch of [{ exp: 1 }, { iss: 'https://attacker.example' }, { aud: 'another-api' }, { role: 'service_role' }, { client_id: 'other' }, { client_id: undefined }]) {
    const { handle, calls } = setup({ ...valid, ...patch })
    const response = await handle(req({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))
    assert(response.status === 401 || response.status === 403)
    assert(calls.length === 0)
  }
})
Deno.test('rechaza origen no permitido y solicitudes enormes', async () => {
  const { handle } = setup()
  const request = req({}); request.headers.set('Origin', 'https://attacker.example')
  assert((await handle(request)).status === 403)
  assert((await handle(req({ text: 'a'.repeat(33000) }))).status === 413)
})
Deno.test('initialize y tools/list anuncian solamente herramientas de lectura', async () => {
  const { handle, calls } = setup()
  const init = await rpc(handle, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'qa', version: '1' } })
  assert(init.response.status === 200)
  assert(init.body.result.serverInfo.name === 'historia-clinica')
  const { body } = await rpc(handle, 'tools/list')
  assert(body.result.tools.length === 3)
  assert(body.result.tools.every((tool: { annotations: { readOnlyHint: boolean; destructiveHint: boolean } }) => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint))
  assert(calls.length === 0)
})
Deno.test('búsqueda pagina, no permite comodines ni métodos de escritura', async () => {
  const { handle, calls } = setup(valid, [{ id: '1' }, { id: '2' }])
  const { body } = await rpc(handle, 'tools/call', { name: 'buscar_pacientes', arguments: { nombre: 'A_%', limite: 1, pagina: 0 } })
  const result = JSON.parse(body.result.content[0].text)
  assert(result.pacientes.length === 1 && result.siguiente_pagina === 1)
  assert(calls.find(c => c.name === 'ilike')?.args[1] === '%A\\_\\%%')
  assert(!calls.some(c => ['insert', 'update', 'delete', 'rpc'].includes(c.name)))
})
Deno.test('valida UUID, campos y límites antes de consultar', async () => {
  for (const [name, args] of [['leer_historia_clinica', { paciente_id: 'otro' }], ['buscar_pacientes', { nombre: 'Ana', limite: 9999 }], ['buscar_consultas', { texto: 'dolor', campo: 'password' }]] as const) {
    const { handle, calls } = setup()
    const { body } = await rpc(handle, 'tools/call', { name, arguments: args })
    assert(body.error || body.result?.isError)
    assert(calls.length === 0)
  }
})
