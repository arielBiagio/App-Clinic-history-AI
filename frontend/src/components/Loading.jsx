import './Loading.css'

export default function Loading({ label = 'Cargando...', inline = false }) {
  return (
    <span className={`loading${inline ? ' loading--inline' : ''}`} role="status">
      <span className="loading__spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
