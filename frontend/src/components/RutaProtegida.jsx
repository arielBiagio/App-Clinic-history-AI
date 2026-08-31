import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

// Envuelve rutas que requieren sesión activa. Si no hay sesión, manda a /login.
export default function RutaProtegida({ children }) {
  const { estaLogueado, cargando } = useAuth()

  if (cargando) return null // podría ser un spinner, pero evita parpadeo del login

  if (!estaLogueado) return <Navigate to="/login" replace />

  return children
}
