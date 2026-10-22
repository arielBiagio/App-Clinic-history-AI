import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import evaluacionesRouter from './routes/evaluaciones.js'
import pacientesRouter from './routes/pacientes.js'

const app = express()

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : []),
].filter(Boolean))

app.use(cors({
  origin(origin, callback) {
    callback(null, allowedOrigins.has(origin))
  },
}))
app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/api/evaluaciones', evaluacionesRouter)
app.use('/api/pacientes', pacientesRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend escuchando en el puerto ${PORT}`)
})
