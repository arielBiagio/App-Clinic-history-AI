import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Navigate } from 'react-router-dom'
import './Login.css'
import Loading from '../components/Loading'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { estaLogueado } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  // Si ya hay sesión activa, no tiene sentido mostrar el login de nuevo.
  if (estaLogueado) {
    const destino = location.state?.from || '/'
    return <Navigate to={destino} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setCargando(false)

    if (errorLogin) {
      setError('Email o contraseña incorrectos.')
      return
    }

    navigate(location.state?.from || '/')
  }

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__titulo">Historia Clínica IA</h1>
        <p className="login__subtitulo">Ingresá con tu cuenta de profesional.</p>

        <form onSubmit={handleSubmit}>
          <div className="login__campo">
            <label className="login__label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="login__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="login__campo">
            <label className="login__label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="login__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="login__error">{error}</p>}

          <button
            type="submit"
            className="boton boton--primario login__boton"
            disabled={cargando}
          >
            {cargando ? <Loading inline label="Ingresando..." /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
