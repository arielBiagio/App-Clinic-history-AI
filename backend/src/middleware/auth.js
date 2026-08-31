import { supabaseAuth } from '../lib/supabaseClients.js'

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

  req.usuario = data.user
  next()
}
