import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiDelete, apiGet, apiPatch } from '../lib/api'
import { formatearFechaCorta } from '../lib/fechas'
import './DetallePaciente.css'

const CAMPOS = [
  { key: 'motivo_consulta', label: 'Motivo de consulta', tipo: 'textarea' },
  { key: 'edad', label: 'Edad', tipo: 'numero' },
  { key: 'escala_dolor', label: 'Dolor (EVA 0-10)', tipo: 'numero' },
  { key: 'fecha_inicio', label: 'Fecha de inicio', tipo: 'fecha' },
  { key: 'antecedentes', label: 'Antecedentes', tipo: 'textarea' },
  { key: 'examen_fisico', label: 'Examen físico', tipo: 'textarea' },
  { key: 'diagnostico', label: 'Diagnóstico', tipo: 'textarea' },
  { key: 'plan_terapeutico', label: 'Plan terapéutico', tipo: 'textarea' },
  { key: 'comentarios_ia', label: 'Comentarios IA', tipo: 'textarea' },
]

// Ajusta la altura de un textarea a su contenido, sin scroll interno.
function ajustarAltura(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Fuera del componente a propósito: si viviera adentro, React la trataría
// como un componente nuevo en cada render y remontaría el input en cada
// tecla (perdiendo el foco después de un solo carácter).
function Campo({ label, valor }) {
  return (
    <div>
      <p className="detalle__campo-label">{label}</p>
      <p className={`detalle__campo-valor ${!valor ? 'detalle__campo-valor--vacio' : ''}`}>
        {valor || 'No especificado'}
      </p>
    </div>
  )
}

function CampoEditable({ campo, valor, onChange }) {
  const valorMostrado = valor ?? ''

  if (campo.tipo === 'textarea') {
    return (
      <div className="detalle__campo-editable">
        <label className="detalle__campo-label" htmlFor={campo.key}>
          {campo.label}
        </label>
        <textarea
          id={campo.key}
          ref={ajustarAltura}
          className="detalle__edit-input"
          rows={1}
          value={valorMostrado}
          onChange={(e) => {
            onChange(campo.key, e.target.value)
            ajustarAltura(e.target)
          }}
        />
      </div>
    )
  }

  return (
    <div className="detalle__campo-editable">
      <label className="detalle__campo-label" htmlFor={campo.key}>
        {campo.label}
      </label>
      <input
        id={campo.key}
        className="detalle__edit-input"
        type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'}
        min={campo.key === 'escala_dolor' ? 0 : undefined}
        max={campo.key === 'escala_dolor' ? 10 : undefined}
        value={valorMostrado}
        onChange={(e) => onChange(campo.key, e.target.value)}
      />
    </div>
  )
}

export default function DetallePaciente() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [paciente, setPaciente] = useState(null)
  const [tabActivo, setTabActivo] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(null)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  function cargarPaciente() {
    setCargando(true)
    return apiGet(`/api/pacientes/${id}`)
      .then(setPaciente)
      .catch(() => setError('No se pudo cargar el paciente.'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargarPaciente()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (cargando) {
    return (
      <div className="detalle">
        <p className="detalle__vacio">Cargando...</p>
      </div>
    )
  }

  if (error || !paciente) {
    return (
      <div className="detalle">
        <p className="detalle__vacio">{error || 'No se encontró el paciente.'}</p>
      </div>
    )
  }

  const iniciales = paciente.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const evaluacionActiva = paciente.evaluaciones[tabActivo]

  function iniciarEdicion() {
    setBorrador({ ...evaluacionActiva.contenido })
    setEditando(true)
  }

  function cancelarEdicion() {
    setEditando(false)
    setBorrador(null)
  }

  function handleCambiarCampo(key, valor) {
    setBorrador((prev) => ({ ...prev, [key]: valor === '' ? null : valor }))
  }

  async function handleGuardarEdicion() {
    setGuardandoEdicion(true)
    try {
      const contenidoLimpio = {
        ...borrador,
        edad: borrador.edad === null || borrador.edad === '' ? null : Number(borrador.edad),
        escala_dolor:
          borrador.escala_dolor === null || borrador.escala_dolor === ''
            ? null
            : Number(borrador.escala_dolor),
      }
      await apiPatch(`/api/evaluaciones/${evaluacionActiva.id}`, { contenido: contenidoLimpio })
      await cargarPaciente()
      setEditando(false)
      setBorrador(null)
    } catch (err) {
      setError('No se pudo guardar la edición.')
    } finally {
      setGuardandoEdicion(false)
    }
  }

  async function handleEliminar() {
    try {
      await apiDelete(`/api/evaluaciones/${evaluacionActiva.id}`)
      setConfirmandoBorrado(false)
      setTabActivo(0)
      await cargarPaciente()
    } catch (err) {
      setError('No se pudo eliminar la evaluación.')
    }
  }

  return (
    <div className="detalle">
      <div className="detalle__header">
        <button
          type="button"
          className="detalle__volver"
          onClick={() => navigate('/')}
          aria-label="Volver"
        >
          ←
        </button>
        <div className="detalle__avatar">{iniciales}</div>
        <span className="detalle__nombre">{paciente.nombre}</span>
        <span className="detalle__contador">
          {paciente.evaluaciones.length}{' '}
          {paciente.evaluaciones.length === 1 ? 'evaluación' : 'evaluaciones'}
        </span>
      </div>

      {paciente.evaluaciones.length === 0 ? (
        <p className="detalle__vacio">
          {paciente.nombre} todavía no tiene evaluaciones cargadas.
        </p>
      ) : (
        <>
          <div className="detalle__tabs">
            {paciente.evaluaciones.map((ev, i) => (
              <button
                key={ev.id}
                type="button"
                className={`detalle__tab ${i === tabActivo ? 'detalle__tab--activo' : ''}`}
                onClick={() => {
                  setTabActivo(i)
                  setEditando(false)
                }}
              >
                {formatearFechaCorta(ev.created_at?.split('T')[0])}
              </button>
            ))}
            <button
              type="button"
              className="detalle__tab-nueva"
              onClick={() => navigate(`/paciente/${id}/nueva-evaluacion`)}
              aria-label="Nueva evaluación"
              title="Nueva evaluación"
            >
              +
            </button>
          </div>

          {!editando ? (
            <div className="detalle__campos">
              <Campo label="Motivo de consulta" valor={evaluacionActiva.contenido.motivo_consulta} />

              <div className="detalle__fila">
                <div>
                  <p className="detalle__campo-label">Edad</p>
                  <p className="detalle__campo-valor">
                    {evaluacionActiva.contenido.edad ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="detalle__campo-label">Dolor (EVA)</p>
                  <p
                    className="detalle__campo-valor detalle__dolor"
                    style={{
                      color:
                        evaluacionActiva.contenido.escala_dolor == null
                          ? 'var(--text-muted)'
                          : 'var(--coral-text)',
                    }}
                  >
                    {evaluacionActiva.contenido.escala_dolor != null
                      ? `${evaluacionActiva.contenido.escala_dolor}/10`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="detalle__campo-label">Inicio</p>
                  <p className="detalle__campo-valor">
                    {evaluacionActiva.contenido.fecha_inicio
                      ? formatearFechaCorta(evaluacionActiva.contenido.fecha_inicio)
                      : '—'}
                  </p>
                </div>
              </div>

              <Campo label="Antecedentes" valor={evaluacionActiva.contenido.antecedentes} />
              <Campo label="Examen físico" valor={evaluacionActiva.contenido.examen_fisico} />
              <Campo label="Diagnóstico" valor={evaluacionActiva.contenido.diagnostico} />
              <Campo label="Plan terapéutico" valor={evaluacionActiva.contenido.plan_terapeutico} />
              <Campo label="Comentarios IA" valor={evaluacionActiva.contenido.comentarios_ia} />

              <div className="detalle__acciones-ficha">
                <button type="button" className="boton boton--texto" onClick={iniciarEdicion}>
                  ✎ Editar manualmente
                </button>
                {!confirmandoBorrado ? (
                  <button
                    type="button"
                    className="boton boton--texto detalle__link-borrar"
                    onClick={() => setConfirmandoBorrado(true)}
                  >
                    Eliminar evaluación
                  </button>
                ) : (
                  <span className="detalle__confirmar-borrado">
                    ¿Seguro?
                    <button type="button" className="boton boton--peligro" onClick={handleEliminar}>
                      Sí, eliminar
                    </button>
                    <button
                      type="button"
                      className="boton boton--texto"
                      onClick={() => setConfirmandoBorrado(false)}
                    >
                      Cancelar
                    </button>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="detalle__campos">
              {CAMPOS.map((campo) => (
                <CampoEditable
                  key={campo.key}
                  campo={campo}
                  valor={borrador[campo.key]}
                  onChange={handleCambiarCampo}
                />
              ))}

              <div className="detalle__acciones-ficha">
                <button
                  type="button"
                  className="boton boton--primario"
                  onClick={handleGuardarEdicion}
                  disabled={guardandoEdicion}
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button type="button" className="boton boton--texto" onClick={cancelarEdicion}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
