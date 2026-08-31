import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabaseClients.js'
import { transcribirAudio, limpiarTranscripcion, estructurarEvaluacion } from '../lib/openrouter.js'
import { armarSystemPrompt, armarContenidoEvaluacion } from '../lib/prompt.js'
import { schemaEvaluacion } from '../lib/schema.js'

const router = Router()

// Los audios se guardan brevemente en un tmp dir del SO y se borran
// apenas se transcriben (ver limpieza al final del handler).
const upload = multer({ dest: path.join(os.tmpdir(), 'historia-clinica-audios') })

// Contrato del multipart que espera este endpoint (ver también CapturaPaciente.jsx):
//   - campo 'nombre'      -> string, solo si es paciente nuevo
//   - campo 'pacienteId'  -> string (uuid), solo si es una evaluación para un paciente existente
//   - campo 'notas'       -> JSON.stringify de [{ tipo: 'texto', contenido }, { tipo: 'audio', audioFieldName: 'audio_1' }]
//   - archivos            -> uno por cada nota de audio, con fieldname == audioFieldName (ej. 'audio_1')
router.post('/', requireAuth, upload.any(), async (req, res) => {
  const archivosSubidos = req.files || []

  try {
    const { nombre, pacienteId } = req.body
    const notas = JSON.parse(req.body.notas || '[]')

    if (notas.length === 0) {
      return res.status(400).json({ error: 'No se recibió ninguna nota.' })
    }
    if (!nombre && !pacienteId) {
      return res.status(400).json({ error: 'Falta nombre (paciente nuevo) o pacienteId (existente).' })
    }

    // 1) Paciente: crear si es nuevo, o usar el existente
    let idPaciente = pacienteId
    if (!idPaciente) {
      const { data: nuevoPaciente, error: errorPaciente } = await supabaseAdmin
        .from('pacientes')
        .insert({ nombre })
        .select()
        .single()

      if (errorPaciente) throw errorPaciente
      idPaciente = nuevoPaciente.id
    }

    // 2) Transcribir cada nota de audio (y borrar su archivo temporal apenas se usa)
    const notasProcesadas = []
    for (const nota of notas) {
      if (nota.tipo === 'audio') {
        const archivo = archivosSubidos.find((f) => f.fieldname === nota.audioFieldName)
        if (!archivo) continue

        const transcripcionCruda = await transcribirAudio(archivo.path)
        const transcripcionLimpia = await limpiarTranscripcion(transcripcionCruda)
        notasProcesadas.push({ tipo: 'audio', contenido: transcripcionLimpia })

        fs.unlink(archivo.path, () => {}) // borra el audio ni bien se transcribió
      } else {
        notasProcesadas.push({ tipo: 'texto', contenido: nota.contenido })
      }
    }

    // 3) Armar el contenido y pedirle al LLM la estructura
    const fechaHoy = new Date().toISOString().split('T')[0]
    const systemPrompt = armarSystemPrompt(fechaHoy)
    const contenido = armarContenidoEvaluacion(notasProcesadas)

    const evaluacionEstructurada = await estructurarEvaluacion({
      systemPrompt,
      contenido,
      schema: schemaEvaluacion,
    })

    // 4) Guardar la evaluación en Supabase
    const { data: evaluacionGuardada, error: errorEvaluacion } = await supabaseAdmin
      .from('evaluaciones')
      .insert({ paciente_id: idPaciente, contenido: evaluacionEstructurada })
      .select()
      .single()

    if (errorEvaluacion) throw errorEvaluacion

    res.status(201).json({
      pacienteId: idPaciente,
      evaluacion: evaluacionGuardada,
    })
  } catch (error) {
    console.error('Error en POST /api/evaluaciones:', error)
    res.status(500).json({ error: 'No se pudo procesar la evaluación.' })
  } finally {
    // Por las dudas: si algo falló antes de transcribir, igual limpiamos todo tmp.
    for (const archivo of archivosSubidos) {
      fs.unlink(archivo.path, () => {})
    }
  }
})

// Edición manual de una evaluación puntual (el profesional corrige/completa
// a mano lo que la IA extrajo). Recibe el objeto `contenido` completo.
router.patch('/:id', requireAuth, async (req, res) => {
  const { contenido } = req.body

  if (!contenido || typeof contenido !== 'object') {
    return res.status(400).json({ error: 'Falta el campo contenido.' })
  }

  const { data, error } = await supabaseAdmin
    .from('evaluaciones')
    .update({ contenido })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {
    console.error('Error en PATCH /api/evaluaciones/:id:', error)
    return res.status(500).json({ error: 'No se pudo actualizar la evaluación.' })
  }

  res.json(data)
})

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('evaluaciones')
    .delete()
    .eq('id', req.params.id)

  if (error) {
    console.error('Error en DELETE /api/evaluaciones/:id:', error)
    return res.status(500).json({ error: 'No se pudo eliminar la evaluación.' })
  }

  res.status(204).send()
})

export default router
