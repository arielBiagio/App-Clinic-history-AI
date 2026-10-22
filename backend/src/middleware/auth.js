import { supabaseAuth, clienteUsuario } from '../lib/supabaseClients.js'

// Espera el header: Authorization: Bearer <token>
// El token es el JWT que Supabase Auth le dio al frontend al hacer login.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Falta el token de autenticación.' })
  }

  const { data, error } = await supabaseAuth.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Token inválido o expirado.' })
  }

  // getUser above verifies the token before its claims are inspected.
  // Delegated OAuth access belongs only to the read-only MCP, never this API.
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    if (claims.client_id != null) return res.status(403).json({ error: 'Usá el MCP de solo lectura para este token OAuth.' })
  } catch {
    return res.status(401).json({ error: 'Token inválido.' })
  }

  req.usuario = data.user
  req.supabase = clienteUsuario(token)
  next()
}
