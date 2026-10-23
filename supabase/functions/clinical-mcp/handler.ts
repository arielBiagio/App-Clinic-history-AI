import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClinicalHandler } from './clinical.ts'
import { createClientAuthorizer, type ClientPolicy, type OAuthClientLookup } from './oauth-clients.ts'

export type Config = ClientPolicy & { anonKey: string; resourceUrl: string; origins: string[] }
type Identity = { db: SupabaseClient; claims: Record<string, unknown> }
type Authenticate = (token: string) => Promise<Identity | null>

export function createHandler(config: Config, authenticate?: Authenticate, lookupClient?: OAuthClientLookup) {
  const authorizeClient = createClientAuthorizer(config, lookupClient)
  const resource = new URL(config.resourceUrl)
  const metadataUrl = `${resource.href.replace(/\/$/, '')}/.well-known/oauth-protected-resource`
  // Supabase's gateway strips /functions/v1 before forwarding to Edge Runtime.
  const paths = new Set([resource.pathname, resource.pathname.replace(/^\/functions\/v1(?=\/)/, '')])
  const metadataPaths = new Set([...paths].map(path => `${path.replace(/\/$/, '')}/.well-known/oauth-protected-resource`))
  const issuer = `${config.supabaseUrl.replace(/\/$/, '')}/auth/v1`
  const verify: Authenticate = authenticate || (async token => {
    const db = createClient(config.supabaseUrl, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    // getClaims verifies the signature and expiry, using Auth on symmetric projects.
    const { data, error } = await db.auth.getClaims(token)
    return !error && data?.claims ? { db, claims: data.claims } : null
  })
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url), origin = req.headers.get('Origin')
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Vary': 'Origin' })
    const json = (value: unknown, status: number) => new Response(JSON.stringify(value), { status, headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' } })
    if (origin && !config.origins.includes(origin)) return json({ error: 'Origen no permitido.' }, 403)
    if (origin) headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id')
    headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Session-Id')
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (metadataPaths.has(url.pathname) && req.method === 'GET') return json({
      resource: resource.href, authorization_servers: [issuer], bearer_methods_supported: ['header'],
      resource_name: 'Historia Clínica IA — solo lectura',
    }, 200)
    if (!paths.has(url.pathname)) return json({ error: 'Not found' }, 404)
    if (!['POST', 'GET'].includes(req.method)) return json({ error: 'Método no permitido.' }, 405)
    const token = req.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1]
    let identity: Identity | null = null
    try { if (token) identity = await verify(token) } catch { /* Invalid or unavailable Auth: fail closed. */ }
    const claims = identity?.claims
    const aud = claims?.aud
    if (!claims || claims.iss !== issuer || !(aud === 'authenticated' || (Array.isArray(aud) && aud.includes('authenticated')))
      || typeof claims.sub !== 'string' || claims.role !== 'authenticated' || typeof claims.exp !== 'number' || claims.exp <= Date.now() / 1000) {
      headers.set('WWW-Authenticate', `Bearer resource_metadata="${metadataUrl}"`)
      return json({ error: 'Se requiere autorización OAuth.' }, 401)
    }
    if (!await authorizeClient(claims.client_id)) return json({ error: 'Cliente OAuth no habilitado.' }, 403)
    if (req.method === 'GET') { headers.set('Allow', 'POST, OPTIONS'); return json({ error: 'SSE persistente no disponible. Usar Streamable HTTP POST.' }, 405) }
    const length = Number(req.headers.get('Content-Length') || 0)
    if (length > 32768) return json({ error: 'Solicitud demasiado grande.' }, 413)
    const body = await req.text()
    if (new TextEncoder().encode(body).length > 32768) return json({ error: 'Solicitud demasiado grande.' }, 413)
    try {
      const response = await createClinicalHandler(identity!.db).fetch(new Request(req.url, { method: 'POST', headers: req.headers, body }))
      const merged = new Headers(response.headers)
      headers.forEach((value, key) => merged.set(key, value))
      return new Response(response.body, { status: response.status, headers: merged })
    } catch { return json({ error: 'No se pudo procesar la solicitud MCP.' }, 500) }
  }
}
