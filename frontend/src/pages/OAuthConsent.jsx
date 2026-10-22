import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loading from '../components/Loading'
import './Login.css'

export default function OAuthConsent() {
  const location = useLocation()
  const { estaLogueado, cargando } = useAuth()
  const id = new URLSearchParams(location.search).get('authorization_id')
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!estaLogueado || !id) return
    let active = true
    supabase.auth.oauth.getAuthorizationDetails(id).then(({ data, error: authError }) => {
      if (!active) return
      if (authError || !data) { setError('La solicitud de conexión venció o no es válida.'); return }
      // Returning grants are redirected only to the URL validated by Supabase.
      if (data.redirect_url) { window.location.assign(data.redirect_url); return }
      setDetails(data)
    }).catch(() => { if (active) setError('No se pudo cargar la autorización.') })
    return () => { active = false }
  }, [estaLogueado, id])

  async function decide(allow) {
    setBusy(true); setError('')
    try {
      const method = allow ? 'approveAuthorization' : 'denyAuthorization'
      const { data, error: authError } = await supabase.auth.oauth[method](id, { skipBrowserRedirect: true })
      if (authError || !data?.redirect_url) throw new Error('OAuth failed')
      window.location.assign(data.redirect_url)
    } catch { setError('No se pudo completar la autorización. Intentá de nuevo.'); setBusy(false) }
  }

  if (cargando) return <Loading label="Cargando sesión..." />
  if (!estaLogueado) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return <main className="login"><section className="login__card" aria-labelledby="oauth-title">
    <h1 className="login__titulo" id="oauth-title">Conectar historia clínica</h1>
    {!id ? <p role="alert">Falta la solicitud de autorización. Iniciá la conexión desde tu agente.</p> : <>
      {error && <p role="alert" className="login__error">{error}</p>}
      {!details && !error && <Loading label="Revisando autorización..." />}
      {details && <>
        <p><strong>{details.client?.name || 'Cliente OAuth'}</strong> solicita acceso a tu cuenta.</p>
        <p>Podrá buscar tus pacientes y leer sus evaluaciones para responderte. Solo verá los pacientes asignados a tu usuario. No podrá crear, modificar ni eliminar fichas.</p>
        <p>La información clínica se compartirá con el agente conectado. Sus resúmenes no se guardan como evaluaciones.</p>
        <p className="pagina__subtitulo" style={{ overflowWrap: 'anywhere' }}>Destino de autorización: {details.redirect_uri}</p>
        <p className="pagina__subtitulo">Permisos de identidad: {details.scope || 'Sin permisos adicionales'}</p>
        <div className="modal__acciones" style={{ marginTop: 24 }}>
          <button className="boton" disabled={busy} onClick={() => decide(false)}>Rechazar</button>
          <button className="boton boton--primario" disabled={busy} onClick={() => decide(true)}>{busy ? <Loading inline label="Procesando..." /> : 'Autorizar lectura'}</button>
        </div>
      </>}
    </>}
  </section></main>
}
