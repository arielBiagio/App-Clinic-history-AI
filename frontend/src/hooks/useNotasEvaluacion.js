import { useState } from 'react'

// Placeholder: maneja el array de notas mientras se carga un nuevo paciente
// nota = { id, tipo: 'texto' | 'audio', contenido, timestamp }
export function useNotasEvaluacion() {
  const [notas, setNotas] = useState([])

  function agregarNota(nota) {
    setNotas((prev) => [
      ...prev,
      { id: crypto.randomUUID(), timestamp: Date.now(), ...nota },
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
