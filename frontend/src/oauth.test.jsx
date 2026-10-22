// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OAuthConsent from './pages/OAuthConsent'
import Login from './pages/Login'

const mocks = vi.hoisted(() => ({ loggedIn: true, get: vi.fn(), approve: vi.fn(), deny: vi.fn(), login: vi.fn() }))
vi.mock('./lib/AuthContext', () => ({ useAuth: () => ({ estaLogueado: mocks.loggedIn, cargando: false }) }))
vi.mock('./lib/supabaseClient', () => ({ supabase: { auth: {
  signInWithPassword: mocks.login,
  oauth: { getAuthorizationDetails: mocks.get, approveAuthorization: mocks.approve, denyAuthorization: mocks.deny },
} } }))
function mount(url = '/oauth/consent?authorization_id=test-id') {
  render(<MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/oauth/consent" element={<OAuthConsent />} />
    <Route path="/login" element={<Login />} />
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.loggedIn = true
  mocks.get.mockResolvedValue({ data: { authorization_id: 'test-id', client: { name: 'Sesame de prueba' }, scope: 'openid', redirect_uri: 'https://client.example/callback' }, error: null })
})
afterEach(cleanup)

test('muestra el consentimiento sin autorizar automáticamente', async () => {
  mount(); await screen.findByText('Sesame de prueba')
  expect(screen.getByText(/Solo verá los pacientes asignados/)).toBeTruthy()
  expect(mocks.approve).not.toHaveBeenCalled()
  expect(mocks.deny).not.toHaveBeenCalled()
})
test('solicitud vencida no permite aprobar', async () => {
  mocks.get.mockResolvedValue({ data: null, error: { message: 'expired' } })
  mount(); await screen.findByRole('alert')
  expect(screen.queryByText('Autorizar lectura')).toBeNull()
})
test('sin sesión conserva el destino OAuth después del login', async () => {
  mocks.loggedIn = false; mocks.login.mockResolvedValue({ error: null })
  mount(); await screen.findByLabelText('Email')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'qa@example.com')
  await user.type(screen.getByLabelText('Contraseña'), 'test-password')
  await user.click(screen.getByText('Ingresar'))
  await waitFor(() => expect(mocks.login).toHaveBeenCalledOnce())
  // Router returns to consent; without a session it safely redirects back to login.
  expect(mocks.approve).not.toHaveBeenCalled()
})
test('rechazar llama deny y no approve; fallo permanece visible', async () => {
  mocks.deny.mockResolvedValue({ error: { message: 'simulated' }, data: null })
  mount(); await screen.findByText('Sesame de prueba')
  await userEvent.click(screen.getByText('Rechazar'))
  await screen.findByRole('alert')
  expect(mocks.deny).toHaveBeenCalledWith('test-id', { skipBrowserRedirect: true })
  expect(mocks.approve).not.toHaveBeenCalled()
})
