import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabaseClients.js'

const router = Router()

// Lista de pacientes + fecha de su evaluación más reciente,
// ordenados por esa fecha (o la de creación si todavía no tienen evaluaciones).
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .select('id, nombre, created_at, evaluaciones(created_at, updated_at)')

  if (error) {
    console.error('Error en GET /api/pacientes:', error)
    return res.status(500).json({ error: 'No se pudo obtener la lista de pacientes.' })
  }

  const pacientes = data
    .map((p) => {
      // Actividad de cada evaluación = la más tardía entre cuándo se creó
      // y cuándo se modificó por última vez (editar una evaluación vieja
      // también cuenta como actividad reciente del paciente).
      const fechasActividad = p.evaluaciones.flatMap((e) => [e.created_at, e.updated_at])
      const ultimaEvaluacion = fechasActividad.sort().at(-1) || null
      return {
        id: p.id,
        nombre: p.nombre,
        ultimaEvaluacion,
        actividadReciente: ultimaEvaluacion || p.created_at,
      }
    })
    .sort((a, b) => (a.actividadReciente < b.actividadReciente ? 1 : -1))
    .map(({ actividadReciente, ...resto }) => resto) // no hace falta exponerlo al frontend

  res.json(pacientes)
})

// Detalle de un paciente + todas sus evaluaciones, más recientes primero
router.get('/:id', requireAuth, async (req, res) => {
  const { data: paciente, error: errorPaciente } = await supabaseAdmin
    .from('pacientes')
    .select('id, nombre, created_at')
    .eq('id', req.params.id)
    .single()

  if (errorPaciente || !paciente) {
    return res.status(404).json({ error: 'Paciente no encontrado.' })
  }

  const { data: evaluaciones, error: errorEvaluaciones } = await supabaseAdmin
    .from('evaluaciones')
    .select('id, contenido, created_at, updated_at')
    .eq('paciente_id', req.params.id)

  if (errorEvaluaciones) {
    console.error('Error en GET /api/pacientes/:id:', errorEvaluaciones)
    return res.status(500).json({ error: 'No se pudieron obtener las evaluaciones.' })
  }

  // Orden por actividad más reciente: si una evaluación vieja se edita hoy,
  // sube al principio igual que si fuera nueva.
  evaluaciones.sort((a, b) => {
    const actividadA = a.updated_at > a.created_at ? a.updated_at : a.created_at
    const actividadB = b.updated_at > b.created_at ? b.updated_at : b.created_at
    return actividadA < actividadB ? 1 : -1
  })

  res.json({ ...paciente, evaluaciones })
})

// Borra al paciente y, por el "on delete cascade" del schema, también
// todas sus evaluaciones.
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('pacientes')
    .delete()
    .eq('id', req.params.id)

  if (error) {
    console.error('Error en DELETE /api/pacientes/:id:', error)
    return res.status(500).json({ error: 'No se pudo eliminar el paciente.' })
  }

  res.status(204).send()
})

export default router
