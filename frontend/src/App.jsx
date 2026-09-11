import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import ListaPacientes from './pages/ListaPacientes'
import CapturaPaciente from './pages/CapturaPaciente'
import DetallePaciente from './pages/DetallePaciente'
import './design.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          <Route path="/" element={<ListaPacientes />} />
          <Route path="/nuevo" element={<CapturaPaciente />} />
          <Route path="/paciente/:id/nueva-evaluacion" element={<CapturaPaciente />} />
          <Route path="/paciente/:id" element={<DetallePaciente />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
