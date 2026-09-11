// Metadata lives in the existing JSONB document, outside the clinical fields.
// Only the server writes this timestamp; no schema migration is required.
export function fechaEdicion(evaluacion) {
  const value = evaluacion.updated_at || evaluacion.contenido?._meta?.updated_at
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null
}

export function actividad(evaluacion) {
  return Math.max(Date.parse(evaluacion.created_at) || 0, Date.parse(fechaEdicion(evaluacion)) || 0)
}

export function ordenarEvaluaciones(evaluaciones) {
  return evaluaciones.map(e => ({ ...e, updated_at: fechaEdicion(e) }))
    .sort((a, b) => actividad(b) - actividad(a) || a.id.localeCompare(b.id))
}

export function resumirPacientes(pacientes) {
  return pacientes.map(p => {
    const evaluaciones = p.evaluaciones || []
    const ultimaEvaluacion = evaluaciones.map(e => e.created_at).sort().at(-1) || null
    const ultimaEdicion = evaluaciones.map(fechaEdicion).filter(Boolean).sort().at(-1) || null
    return {
      id: p.id, nombre: p.nombre, ultimaEvaluacion, ultimaEdicion,
      editado: !!ultimaEdicion,
      actividadReciente: new Date(Math.max(Date.parse(p.created_at) || 0, ...evaluaciones.map(actividad))).toISOString(),
    }
  }).sort((a, b) => Date.parse(b.actividadReciente) - Date.parse(a.actividadReciente) || a.id.localeCompare(b.id))
}
