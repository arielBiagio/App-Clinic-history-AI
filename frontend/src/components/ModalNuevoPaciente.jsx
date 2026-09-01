import { useEffect, useState } from 'react'
import './ModalNuevoPaciente.css'

export default function ModalNuevoPaciente({ onConfirmar, onCancelar }) {
  const [nombre, setNombre] = useState('')

  // Evita que la página de atrás se pueda scrollear en mobile mientras
  // el modal está abierto (el overlay tapa la pantalla, pero sin esto
  // el fondo igual se mueve al arrastrar con el dedo).
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowPrevio
    }
  }, [])

  function handleConfirmar() {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) return
    onConfirmar(nombreLimpio)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2 className="modal__titulo">Nuevo paciente</h2>
        <p className="modal__subtitulo">
          Ingresá el nombre para empezar a cargar notas.
        </p>

        <input
          type="text"
          className="modal__input"
          placeholder="Nombre del paciente"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirmar()}
          autoFocus
        />

        <div className="modal__acciones">
          <button type="button" className="boton" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            type="button"
            className="boton boton--primario"
            onClick={handleConfirmar}
            disabled={!nombre.trim()}
          >
            Empezar
          </button>
        </div>
      </div>
    </div>
  )
}
