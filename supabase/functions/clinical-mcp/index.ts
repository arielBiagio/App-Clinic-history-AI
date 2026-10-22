import { createHandler } from './handler.ts'

const required = (key: string) => { const value = Deno.env.get(key); if (!value) throw new Error(`Falta ${key}`); return value }
const list = (key: string) => (Deno.env.get(key) || '').split(',').map(v => v.trim()).filter(Boolean)
Deno.serve(createHandler({
  supabaseUrl: required('SUPABASE_URL'), anonKey: required('SUPABASE_ANON_KEY'),
  resourceUrl: required('MCP_RESOURCE_URL'), clientIds: list('MCP_ALLOWED_CLIENT_IDS'),
  origins: list('MCP_ALLOWED_ORIGINS'),
}))
