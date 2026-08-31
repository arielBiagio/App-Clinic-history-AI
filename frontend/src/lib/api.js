import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL

async function tokenActual() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

// GET simple, para las lecturas (lista de pacientes, detalle).
export async function apiGet(ruta) {
  const token = await tokenActual()
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status} en GET ${ruta}`)
  return respuesta.json()
}

// PATCH con JSON (para editar manualmente una evaluación).
export async function apiPatch(ruta, body) {
  const token = await tokenActual()
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status} en PATCH ${ruta}`)
  return respuesta.json()
}

// DELETE (para borrar una evaluación).
export async function apiDelete(ruta) {
  const token = await tokenActual()
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status} en DELETE ${ruta}`)
}

// POST con FormData (para /api/evaluaciones, que manda notas + archivos de audio).
export async function apiPostFormData(ruta, formData) {
  const token = await tokenActual()
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // sin Content-Type: el navegador lo arma solo con boundary
    body: formData,
  })
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status} en POST ${ruta}`)
  return respuesta.json()
}
