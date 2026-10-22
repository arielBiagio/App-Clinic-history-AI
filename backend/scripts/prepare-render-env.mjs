import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'dotenv'

// Generate an ignored import file with only the variables this service needs.
const source = parse(readFileSync(new URL('../.env', import.meta.url)))
const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'OPENROUTER_API_KEY']
const variables = { NODE_ENV: 'production', FRONTEND_URL: 'http://localhost:5173' }
for (const key of keys) {
  if (!source[key]) throw new Error(`Falta ${key} en backend/.env`)
  variables[key] = source[key]
}
const destination = new URL('../.render-deploy.env', import.meta.url)
writeFileSync(destination, Object.entries(variables)
  .map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n')
console.log(`Archivo de importación generado: ${fileURLToPath(destination)}`)
