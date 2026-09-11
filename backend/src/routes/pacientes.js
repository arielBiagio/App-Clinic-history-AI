import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabaseClients.js'
import { resumirPacientes, ordenarEvaluaciones } from '../lib/actividad.js'

const router = Router()

// Lista de pacientes + fecha de su evaluación más reciente,
// ordenados por esa fecha (o la de creación si todavía no tienen evaluaciones).
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .select('id, nombre, created_at, evaluaciones(created_at, updated_at, metadata_updated_at:contenido->_meta->>updated_at)')


  if (error) {
    console.error('Error en GET /api/pacientes:', error)
    return res.status(500).json({ error: 'No se pudo obtener la lista de pacientes.' })
  }

  const pacientes = resumirPacientes(data)


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

  res.json({ ...paciente, evaluaciones: ordenarEvaluaciones(evaluaciones) })

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
