import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import evaluacionesRouter from './routes/evaluaciones.js'
import pacientesRouter from './routes/pacientes.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/api/evaluaciones', evaluacionesRouter)
app.use('/api/pacientes', pacientesRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`)
})
