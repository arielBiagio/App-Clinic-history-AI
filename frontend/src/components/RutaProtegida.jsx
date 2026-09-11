import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import Loading from './Loading'

// Envuelve rutas que requieren sesión activa. Si no hay sesión, manda a /login.
export default function RutaProtegida({ children }) {
  const { estaLogueado, cargando } = useAuth()

  if (cargando) return <Loading label="Cargando sesión..." />

  if (!estaLogueado) return <Navigate to="/login" replace />

  return children
}
