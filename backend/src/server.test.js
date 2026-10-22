import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

test('production server: health, private endpoints and exact CORS origin', { timeout: 20000 }, async () => {
  const reservation = createServer()
  reservation.listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const port = reservation.address().port
  await new Promise(resolve => reservation.close(resolve))
  const child = spawn(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: {
      ...process.env,
      PORT: String(port), NODE_ENV: 'production',
      FRONTEND_URL: 'https://clinic.example.test',
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'test-public-key',
      OPENROUTER_API_KEY: 'test-only-not-a-real-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const base = `http://127.0.0.1:${port}`
  try {
    let health, lastError
    for (let attempt = 0; attempt < 100; attempt++) {
      try { health = await fetch(`${base}/health`); break } catch (error) {
        lastError = error.cause?.message || error.message
        assert.equal(child.exitCode, null, 'server exited before becoming healthy')
        await delay(50)
      }
    }
    assert.ok(health, `server did not become healthy: ${lastError}; ${output}`)
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true })
    for (const path of ['/api/pacientes', '/api/evaluaciones']) {
      const response = await fetch(`${base}${path}`, { method: path.endsWith('evaluaciones') ? 'POST' : 'GET' })
      assert.equal(response.status, 401, `${path} must require authentication`)
    }
    const allowed = await fetch(`${base}/health`, { headers: { Origin: 'https://clinic.example.test' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://clinic.example.test')
    for (const origin of ['https://other.example.test', 'http://localhost:5173']) {
      const blocked = await fetch(`${base}/health`, { headers: { Origin: origin } })
      assert.equal(blocked.headers.get('access-control-allow-origin'), null)
    }
  } finally {
    if (child.exitCode === null) {
      child.kill()
      await once(child, 'exit')
    }
  }
})
