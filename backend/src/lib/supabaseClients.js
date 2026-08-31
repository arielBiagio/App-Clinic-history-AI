import { createClient } from '@supabase/supabase-js'

// Cliente "admin": usa la service_role key, salta RLS.
// Se usa DESPUÉS de validar el JWT del usuario en el middleware de auth —
// nunca se expone, y solo el backend confiable lo toca.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Cliente liviano, solo para validar tokens de usuarios (auth.getUser).
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
