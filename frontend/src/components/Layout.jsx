import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Layout.css'

// Envuelve todas las rutas: topbar fija + <Outlet /> con la página activa.
export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Sin esto, React Router no vuelve el scroll al top al navegar
  // (a diferencia de la navegación tradicional entre páginas).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  async function handleSalir() {
    // TODO: una vez conectado Supabase Auth de verdad, esto cierra la sesión.
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="layout__topbar">
        <div className="layout__topbar-inner">
          <Link to="/" className="layout__marca">
            Historia Clínica IA
          </Link>
          <button type="button" className="layout__salir" onClick={handleSalir}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="layout__contenido">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
