import './NotaItem.css'

// nota = { id, tipo: 'texto' | 'audio', contenido, duracion? }
export default function NotaItem({ nota, onQuitar }) {
  const esAudio = nota.tipo === 'audio'

  return (
    <div className={`nota ${esAudio ? 'nota--audio' : 'nota--texto'}`}>
      <span className="nota__icono" aria-hidden="true">
        {esAudio ? '🎙️' : '📝'}
      </span>
      <span className="nota__contenido">
        {esAudio ? `Audio · ${nota.duracion || '0:00'}` : nota.contenido}
      </span>
      <button
        type="button"
        className="nota__quitar"
        onClick={() => onQuitar(nota.id)}
        aria-label="Quitar nota"
      >
        −
      </button>
    </div>
  )
}
