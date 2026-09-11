// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ListaPacientes from './pages/ListaPacientes'
import CapturaPaciente from './pages/CapturaPaciente'
import DetallePaciente from './pages/DetallePaciente'
import Login from './pages/Login'
import Layout from './components/Layout'
import { apiGet, apiDelete, apiPatch, apiPostFormData } from './lib/api'
import { supabase } from './lib/supabaseClient'

vi.mock('./lib/api', () => ({ apiGet: vi.fn(), apiDelete: vi.fn(), apiPatch: vi.fn(), apiPostFormData: vi.fn() }))
vi.mock('./lib/supabaseClient', () => ({ supabase: { auth: { signInWithPassword: vi.fn(), signOut: vi.fn() } } }))
vi.mock('./lib/AuthContext', () => ({ useAuth: () => ({ estaLogueado: false }) }))
vi.mock('./hooks/useGrabadorAudio', () => ({
  useGrabadorAudio: () => ({ grabando: false, segundos: 0, iniciarGrabacion: vi.fn(), detenerGrabacion: vi.fn() }),
  formatearDuracion: () => '0:01',
}))

const patient = { id: 'p1', nombre: 'Paciente ficticio', evaluaciones: [
  { id: 'e1', created_at: '2026-09-11T10:00:00Z', contenido: { motivo_consulta: 'Nota de prueba', edad: 42, escala_dolor: 0 } },
  { id: 'e2', created_at: '2026-09-04T10:00:00Z', contenido: { motivo_consulta: 'Evaluación anterior' } },
] }
function mount(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Layout />}>
      <Route path="/" element={<ListaPacientes />} />
      <Route path="/nuevo" element={<CapturaPaciente />} />
      <Route path="/paciente/:id" element={<DetallePaciente />} />
      <Route path="/paciente/:id/nueva-evaluacion" element={<CapturaPaciente />} />
    </Route>
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  vi.resetAllMocks()
  apiGet.mockImplementation(async path => path === '/api/pacientes' ? [{ ...patient, ultimaEvaluacion: null }] : structuredClone(patient))
  apiPostFormData.mockResolvedValue({ pacienteId: 'p1' })
})
afterEach(cleanup)

test('buscar, abrir ficha, cambiar evaluación y editar conservan los endpoints', async () => {
  const user = userEvent.setup(); mount()
  await screen.findByText('Paciente ficticio')
  await user.type(screen.getByLabelText('Buscar paciente'), 'ausente')
  expect(screen.getByText('No se encontraron pacientes.')).toBeTruthy()
  await user.clear(screen.getByLabelText('Buscar paciente'))
  await user.click(screen.getByText('Paciente ficticio'))
  await screen.findByText('Nota de prueba')
  expect(screen.getByText('0/10')).toBeTruthy()
  const tabs = document.querySelectorAll('.detalle__tab')
  await user.click(tabs[1]); expect(screen.getByText('Evaluación anterior')).toBeTruthy()
  await user.click(tabs[0]); await user.click(screen.getByText(/Editar manualmente/))
  await user.clear(screen.getByLabelText('Motivo de consulta'))
  await user.type(screen.getByLabelText('Motivo de consulta'), 'Texto corregido')
  await user.click(screen.getByText('Guardar cambios'))
  await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/api/evaluaciones/e1', expect.objectContaining({ contenido: expect.objectContaining({ motivo_consulta: 'Texto corregido', escala_dolor: 0 }) })))
})

test('crear paciente, agregar por botón y Enter, quitar y guardar multipart', async () => {
  const user = userEvent.setup(); mount('/nuevo')
  await user.type(screen.getByPlaceholderText('Nombre del paciente'), 'Prueba local')
  await user.click(screen.getByText('Empezar'))
  await user.click(screen.getByText('Guardar paciente'))
  expect(screen.getByText('Agregá al menos una nota antes de guardar.')).toBeTruthy()
  const input = screen.getByLabelText('Escribir una nota rápida')
  await user.type(input, 'Primera nota'); await user.click(screen.getByText('Agregar nota'))
  await user.type(input, 'Segunda nota{Enter}')
  await user.click(screen.getAllByLabelText('Quitar nota')[0])
  await user.click(screen.getByText('Guardar paciente'))
  await waitFor(() => expect(apiPostFormData).toHaveBeenCalledOnce())
  const [url, form] = apiPostFormData.mock.calls[0]
  expect(url).toBe('/api/evaluaciones'); expect(form.get('nombre')).toBe('Prueba local')
  expect(JSON.parse(form.get('notas'))).toEqual([{ tipo: 'texto', contenido: 'Segunda nota' }])
  await screen.findByText('Paciente guardado')
})

test('paciente sin evaluaciones permite iniciar una y conserva pacienteId', async () => {
  apiGet.mockResolvedValue({ ...patient, evaluaciones: [] })
  const user = userEvent.setup(); mount('/paciente/p1')
  await user.click(await screen.findByText('+ Nueva evaluación'))
  await screen.findByText('Nueva evaluación para Paciente ficticio')
  await user.type(screen.getByLabelText('Escribir una nota rápida'), 'Nota{Enter}')
  await user.click(screen.getByText('Guardar paciente'))
  await waitFor(() => expect(apiPostFormData).toHaveBeenCalledOnce())
  expect(apiPostFormData.mock.calls[0][1].get('pacienteId')).toBe('p1')
  expect(apiPostFormData.mock.calls[0][1].has('nombre')).toBe(false)
})

test('fallo de guardado conserva las notas y permite volver a intentar', async () => {
  apiPostFormData.mockRejectedValue(new Error('fallo simulado'))
  const user = userEvent.setup(); mount('/paciente/p1/nueva-evaluacion')
  await screen.findByText('Nueva evaluación para Paciente ficticio')
  await user.type(screen.getByLabelText('Escribir una nota rápida'), 'Conservar nota{Enter}')
  await user.click(screen.getByText('Guardar paciente'))
  await screen.findByText('Ocurrió un error al guardar. Intentá de nuevo.')
  expect(screen.getByText('Conservar nota')).toBeTruthy()
  expect(screen.getByText('Guardar paciente').disabled).toBe(false)
})

test('eliminar paciente exige confirmación y actualiza la lista', async () => {
  const user = userEvent.setup(); mount(); await screen.findByText('Paciente ficticio')
  await user.click(screen.getByLabelText('Más opciones'))
  await user.click(screen.getByText('Eliminar paciente')); expect(apiDelete).not.toHaveBeenCalled()
  await user.click(screen.getByText('Sí, eliminar'))
  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/api/pacientes/p1'))
  await screen.findByText('Todavía no cargaste ningún paciente.')
})

test('eliminar evaluación exige confirmación', async () => {
  const user = userEvent.setup(); mount('/paciente/p1'); await screen.findByText('Nota de prueba')
  await user.click(screen.getByText('Eliminar evaluación')); expect(apiDelete).not.toHaveBeenCalled()
  await user.click(screen.getByText('Sí, eliminar'))
  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/api/evaluaciones/e1'))
})

test('ingreso y cierre de sesión mantienen las llamadas de autenticación', async () => {
  supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
  const user = userEvent.setup(); mount('/login')
  await user.type(screen.getByLabelText('Email'), 'prueba@example.com')
  await user.type(screen.getByLabelText('Contraseña'), 'solo-prueba')
  await user.click(screen.getByText('Ingresar'))
  await screen.findByText('Paciente ficticio')
  expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'prueba@example.com', password: 'solo-prueba' })
  await user.click(screen.getByText('Cerrar sesión'))
  expect(supabase.auth.signOut).toHaveBeenCalledOnce()
  await screen.findByText('Ingresar')
})
