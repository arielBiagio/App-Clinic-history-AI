export type OAuthClientLookup = (clientId: string) => Promise<unknown>
export type ClientPolicy = {
  supabaseUrl: string
  clientIds: string[]
  trustedPublicRedirectUris?: string[]
  serviceRoleKey?: string
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function safeCallback(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash
  } catch { return false }
}

// Admin credential is ONLY used for Auth client metadata, never clinical queries.
// Fixed project endpoint, no redirects, bounded timeout, no token or metadata logs.
export function createOAuthClientLookup(supabaseUrl: string, serviceRoleKey: string, request: typeof fetch = fetch): OAuthClientLookup {
  return async clientId => {
    if (!uuid.test(clientId)) return null
    const response = await request(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/oauth/clients/${clientId}`, {
      method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000),
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    if (!response.ok) { await response.body?.cancel(); return null }
    return await response.json()
  }
}

export function createClientAuthorizer(policy: ClientPolicy, lookup?: OAuthClientLookup) {
  const callbacks = (policy.trustedPublicRedirectUris || []).filter(safeCallback)
  const readClient = lookup || (policy.serviceRoleKey
    ? createOAuthClientLookup(policy.supabaseUrl, policy.serviceRoleKey) : undefined)
  return async (clientId: unknown): Promise<boolean> => {
    if (typeof clientId !== 'string') return false
    if (policy.clientIds.includes(clientId)) return true
    if (!uuid.test(clientId) || !callbacks.length || !readClient) return false
    try {
      const value = await readClient(clientId)
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false
      const client = value as Record<string, unknown>
      return client.client_id === clientId && client.client_type === 'public'
        && client.token_endpoint_auth_method === 'none' && client.registration_type === 'dynamic'
        && Array.isArray(client.redirect_uris) && client.redirect_uris.length === 1
        && typeof client.redirect_uris[0] === 'string' && callbacks.includes(client.redirect_uris[0])
        && Array.isArray(client.grant_types) && client.grant_types.includes('authorization_code')
        && client.grant_types.every(grant => grant === 'authorization_code' || grant === 'refresh_token')
        && Array.isArray(client.response_types) && client.response_types.length === 1 && client.response_types[0] === 'code'
    } catch { return false }
  }
}
