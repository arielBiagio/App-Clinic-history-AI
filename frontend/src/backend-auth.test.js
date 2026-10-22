import { beforeEach, expect, test, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), cliente: vi.fn() }))
vi.mock('../../backend/src/lib/supabaseClients.js', () => ({ supabaseAuth: { auth: { getUser: mocks.getUser } }, clienteUsuario: mocks.cliente }))
import { requireAuth } from '../../backend/src/middleware/auth.js'

const token = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'a' } }, error: null }) })
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() })
test('token OAuth válido no puede entrar en la API con privilegios de escritura', async () => {
  const req = { headers: { authorization: `Bearer ${token({ client_id: 'sesame' })}` } }, res = response(), next = vi.fn()
  await requireAuth(req, res, next)
  expect(res.status).toHaveBeenCalledWith(403)
  expect(next).not.toHaveBeenCalled()
  expect(mocks.cliente).not.toHaveBeenCalled()
})
test('sesión propia usa un cliente RLS del usuario', async () => {
  const raw = token({ sub: 'a' }), db = {}; mocks.cliente.mockReturnValue(db)
  const req = { headers: { authorization: `Bearer ${raw}` } }, next = vi.fn()
  await requireAuth(req, response(), next)
  expect(req.supabase).toBe(db)
  expect(mocks.cliente).toHaveBeenCalledWith(raw)
  expect(next).toHaveBeenCalledOnce()
})
test('token no verificado nunca llega a los datos', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad signature') })
  const res = response(), next = vi.fn()
  await requireAuth({ headers: { authorization: 'Bearer fake' } }, res, next)
  expect(res.status).toHaveBeenCalledWith(401)
  expect(next).not.toHaveBeenCalled()
})
