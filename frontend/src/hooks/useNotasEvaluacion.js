import { useState } from 'react'

// Genera un id único local, sin depender de crypto.randomUUID() —
// esa API del navegador solo funciona en contextos seguros (HTTPS o
// localhost), y esta app se prueba también desde la IP de la red local
// (http://192.168.x.x:5173) para verla en el celular, donde no está
// disponible. Este id nunca viaja a la base de datos, solo se usa en
// memoria para el key de React y para poder borrar una nota puntual.
function generarIdLocal() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Maneja el array de notas mientras se carga un nuevo paciente.
// nota = { id, tipo: 'texto' | 'audio', contenido, timestamp }
export function useNotasEvaluacion() {
  const [notas, setNotas] = useState([])

  function agregarNota(nota) {
    setNotas((prev) => [
      ...prev,
      { id: generarIdLocal(), timestamp: Date.now(), ...nota },
    ])
  }

  function quitarNota(id) {
    setNotas((prev) => prev.filter((n) => n.id !== id))
  }

  function limpiarNotas() {
    setNotas([])
  }

  return { notas, agregarNota, quitarNota, limpiarNotas }
}