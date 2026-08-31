import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiDelete, apiGet } from '../lib/api'
import { formatearFechaRelativa } from '../lib/fechas'
import './ListaPacientes.css'

export default function ListaPacientes() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [menuAbiertoId, setMenuAbiertoId] = useState(null)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(null)

  function cargarPacientes() {
    setCargando(true)
    return apiGet('/api/pacientes')
      .then(setPacientes)
      .catch(() => setError('No se pudo cargar la lista de pacientes.'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargarPacientes()
  }, [])

  // Cierra cualquier menú abierto si el usuario clickea afuera.
  useEffect(() => {
    function handleClickFuera() {
      setMenuAbiertoId(null)
      setConfirmandoBorrado(null)
    }
    document.addEventListener('click', handleClickFuera)
    return () => document.removeEventListener('click', handleClickFuera)
  }, [])

  async function handleEliminarPaciente(id) {
    try {
      await apiDelete(`/api/pacientes/${id}`)
      setPacientes((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError('No se pudo eliminar el paciente.')
    } finally {
      setMenuAbiertoId(null)
      setConfirmandoBorrado(null)
    }
  }

  const pacientesFiltrados = pacientes.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function iniciales(nombre) {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('')
  }

  return (
    <div className="lista">
      <div className="lista__header">
        <h1 className="lista__titulo">Pacientes</h1>
        <button
          type="button"
          className="boton boton--primario lista__nuevo"
          onClick={() => navigate('/nuevo')}
        >
          + Nuevo
        </button>
      </div>

      <input
        type="text"
        className="lista__buscar"
        placeholder="Buscar paciente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {cargando && <p className="lista__vacio">Cargando pacientes...</p>}
      {error && <p className="lista__vacio">{error}</p>}

      {!cargando && !error && (
        <div className="lista__items">
          {pacientesFiltrados.length === 0 ? (
            <p className="lista__vacio">
              {pacientes.length === 0
                ? 'Todavía no cargaste ningún paciente.'
                : 'No se encontraron pacientes.'}
            </p>
          ) : (
            pacientesFiltrados.map((paciente) => (
              <div key={paciente.id} className="lista__item-wrap">
                <button
                  type="button"
                  className="lista__item"
                  onClick={() => navigate(`/paciente/${paciente.id}`)}
                >
                  <div className="lista__avatar">{iniciales(paciente.nombre)}</div>
                  <div className="lista__info">
                    <p className="lista__nombre">{paciente.nombre}</p>
                    <p className="lista__fecha">
                      Última evaluación · {formatearFechaRelativa(paciente.ultimaEvaluacion)}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="lista__kebab"
                  aria-label="Más opciones"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmandoBorrado(null)
                    setMenuAbiertoId((prev) => (prev === paciente.id ? null : paciente.id))
                  }}
                >
                  ⋮
                </button>

                {menuAbiertoId === paciente.id && (
                  <div className="lista__menu" onClick={(e) => e.stopPropagation()}>
                    {confirmandoBorrado !== paciente.id ? (
                      <button
                        type="button"
                        className="lista__menu-item lista__menu-item--peligro"
                        onClick={() => setConfirmandoBorrado(paciente.id)}
                      >
                        Eliminar paciente
                      </button>
                    ) : (
                      <div className="lista__menu-confirmar">
                        <p>¿Eliminar a {paciente.nombre}? Se borran también sus evaluaciones.</p>
                        <div className="lista__menu-confirmar-acciones">
                          <button
                            type="button"
                            className="boton boton--peligro"
                            onClick={() => handleEliminarPaciente(paciente.id)}
                          >
                            Sí, eliminar
                          </button>
                          <button
                            type="button"
                            className="boton boton--texto"
                            onClick={() => setConfirmandoBorrado(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
