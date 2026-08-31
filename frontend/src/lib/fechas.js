export function formatearFechaRelativa(fechaISO) {
  if (!fechaISO) return 'Sin evaluaciones'

  const fecha = new Date(fechaISO)
  const hoy = new Date()
  const diffMs = hoy.setHours(0, 0, 0, 0) - new Date(fecha).setHours(0, 0, 0, 0)
  const dias = Math.round(diffMs / 86400000)

  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  if (dias < 30) return `hace ${Math.round(dias / 7)} semana${dias >= 14 ? 's' : ''}`
  return `hace ${Math.round(dias / 30)} mes${dias >= 60 ? 'es' : ''}`
}

export function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return '—'
  const fecha = new Date(fechaISO + 'T00:00:00')
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
