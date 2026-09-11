import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ModalNuevoPaciente from '../components/ModalNuevoPaciente'
import NotaItem from '../components/NotaItem'
import { useNotasEvaluacion } from '../hooks/useNotasEvaluacion'
import { useGrabadorAudio, formatearDuracion } from '../hooks/useGrabadorAudio'
import { apiGet, apiPostFormData } from '../lib/api'
import './CapturaPaciente.css'
import Loading from '../components/Loading'

export default function CapturaPaciente() {
  const navigate = useNavigate()
  const { id: pacienteIdExistente } = useParams() // presente solo en /paciente/:id/nueva-evaluacion
  const esPacienteExistente = !!pacienteIdExistente

  const { notas, agregarNota, quitarNota, limpiarNotas } = useNotasEvaluacion()
  const { grabando, segundos, iniciarGrabacion, detenerGrabacion } = useGrabadorAudio()

  const [nombrePaciente, setNombrePaciente] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(!esPacienteExistente)
  const [cargandoPaciente, setCargandoPaciente] = useState(esPacienteExistente)
  const [textoActual, setTextoActual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)

  // Si es una evaluación nueva de un paciente existente, traemos su nombre
  // para el header — no hace falta el modal de nombre en este caso.
  useEffect(() => {
    if (!esPacienteExistente) return
    apiGet(`/api/pacientes/${pacienteIdExistente}`)
      .then((p) => setNombrePaciente(p.nombre))
      .catch(() => setError('No se pudo cargar el paciente.'))
      .finally(() => setCargandoPaciente(false))
  }, [esPacienteExistente, pacienteIdExistente])

  const iniciales = nombrePaciente
    ? nombrePaciente
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : ''

  function handleConfirmarNombre(nombre) {
    setNombrePaciente(nombre)
    setModalAbierto(false)
  }

  function handleCambiarTexto(e) {
    setTextoActual(e.target.value)
    ajustarAlturaTextarea(e.target)
  }

  function ajustarAlturaTextarea(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleAgregarTexto() {
    const contenido = textoActual.trim()
    if (!contenido) return
    agregarNota({ tipo: 'texto', contenido })
    setTextoActual('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  async function handleMic() {
    setError(null)
    if (!grabando) {
      try {
        await iniciarGrabacion()
      } catch (err) {
        setError('No se pudo acceder al micrófono. Revisá los permisos del navegador.')
      }
      return
    }

    const resultado = await detenerGrabacion()
    if (resultado) {
      agregarNota({
        tipo: 'audio',
        contenido: resultado.blob,
        duracion: formatearDuracion(resultado.duracionSegundos),
      })
    }
  }

  async function handleGuardarPaciente() {
    if (notas.length === 0) {
      setError('Agregá al menos una nota antes de guardar.')
      return
    }
    setGuardando(true)
    setError(null)

    try {
      const formData = new FormData()
      if (esPacienteExistente) {
        formData.append('pacienteId', pacienteIdExistente)
      } else {
        formData.append('nombre', nombrePaciente)
      }

      let contadorAudio = 0
      const notasMeta = notas.map((nota) => {
        if (nota.tipo === 'audio') {
          const audioFieldName = `audio_${contadorAudio++}`
          formData.append(audioFieldName, nota.contenido, 'audio.webm')
          return { tipo: 'audio', audioFieldName }
        }
        return { tipo: 'texto', contenido: nota.contenido }
      })
      formData.append('notas', JSON.stringify(notasMeta))

      const resultado = await apiPostFormData('/api/evaluaciones', formData)

      limpiarNotas()
      setGuardadoOk(resultado.pacienteId)
    } catch (err) {
      setError('Ocurrió un error al guardar. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // Pantalla de confirmación, se muestra 1.1s antes de ir a la ficha —
  // le da al profesional una señal clara de que sí se guardó.
  useEffect(() => {
    if (!guardadoOk) return
    const timeout = setTimeout(() => navigate(`/paciente/${guardadoOk}`), 1100)
    return () => clearTimeout(timeout)
  }, [guardadoOk, navigate])

  if (guardadoOk) {
    return (
      <div className="captura captura--confirmacion">
        <div className="confirmacion__check" aria-hidden="true">✓</div>
        <p className="confirmacion__texto">Paciente guardado</p>
      </div>
    )
  }

  if (cargandoPaciente) {
    return (
      <div className="captura">
        <Loading label="Cargando paciente..." />
      </div>
    )
  }

  if (modalAbierto) {
    return (
      <ModalNuevoPaciente
        onConfirmar={handleConfirmarNombre}
        onCancelar={() => navigate('/')}
      />
    )
  }

  return (
    <div className="captura">
        <button
          type="button"
          className="pagina__volver"
          onClick={() => navigate(esPacienteExistente ? `/paciente/${pacienteIdExistente}` : '/')}
          aria-label="Volver"
        >
          <span aria-hidden="true">←</span> {esPacienteExistente ? 'Ficha del paciente' : 'Pacientes'}
        </button>
      <div className="captura__header">
        <div className="captura__avatar">{iniciales}</div>
        <span className="captura__nombre">{nombrePaciente}</span>
        <span className="captura__contador">
          {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
        </span>
      </div>

      {esPacienteExistente && (
        <p className="captura__aviso">Nueva evaluación para {nombrePaciente}</p>
      )}

      <div className="captura__grid">
      <section className="captura__notas" aria-label="Notas de la evaluación">
      <p className="pagina__eyebrow">Nueva evaluación</p>
      <div className="captura__lista">
        {notas.length === 0 ? (
          <p className="captura__vacio">
            Todavía no agregaste ninguna nota. Escribí algo o grabá un audio.
          </p>
        ) : (
          notas.map((nota) => (
            <NotaItem key={nota.id} nota={nota} onQuitar={quitarNota} />
          ))
        )}
      </div>

      {grabando && (
        <p className="captura__grabando">
          Grabando… {formatearDuracion(segundos)}
        </p>
      )}
      {error && <p className="captura__error">{error}</p>}

      </section>
      <section className="captura__composer" aria-label="Captura de notas">
      <h2>Escribir una nota</h2>
      <div className="captura__input-row">
        <textarea
          ref={textareaRef}
          rows={1}
          className="captura__input"
          placeholder="Escribir una nota rápida..."
          aria-label="Escribir una nota rápida"
          value={textoActual}
          onChange={handleCambiarTexto}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAgregarTexto()
            }
          }}
          disabled={grabando}
        />
        <button
          type="button"
          className={`captura__boton-mic ${grabando ? 'captura__boton-mic--activo' : ''}`}
          onClick={handleMic}
          aria-label={grabando ? 'Detener grabación' : 'Grabar audio'}
        >
          {grabando ? '■' : '🎙️'}
        </button>
      </div>

      <div className="captura__agregar">
        <span>Enter para agregar · Shift + Enter para un salto</span>
        <button type="button" className="boton" onClick={handleAgregarTexto} disabled={grabando || !textoActual.trim()}>Agregar nota</button>
      </div>

      <button
        type="button"
        className="boton boton--primario captura__guardar"
        onClick={handleGuardarPaciente}
        disabled={guardando || grabando}
      >
        {guardando ? <Loading inline label="Guardando..." /> : 'Guardar paciente'}
      </button>
      </section>
      </div>
    </div>
  )
}
