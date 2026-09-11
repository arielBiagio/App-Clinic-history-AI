import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumirPacientes, ordenarEvaluaciones } from './actividad.js'

test('una edición antigua sube el paciente por encima de una creación posterior', () => {
  const rows = resumirPacientes([
    { id: 'new', created_at: '2026-09-10', evaluaciones: [] },
    { id: 'old', created_at: '2026-08-01', evaluaciones: [{ created_at: '2026-08-02', updated_at: '2026-09-11T12:00:00Z' }] },
  ])
  assert.deepEqual(rows.map(p => p.id), ['old', 'new'])
  assert.equal(rows[0].editado, true)
  assert.equal(rows[1].editado, false)
  assert.equal(rows[0].ultimaEvaluacion, '2026-08-02')
})
test('evaluaciones ordenadas por edición o creación con soporte para fichas antiguas', () => {
  const rows = ordenarEvaluaciones([
    { id: 'new', created_at: '2026-09-10', contenido: {} },
    { id: 'old', created_at: '2026-08-01', contenido: { _meta: { updated_at: '2026-09-11T12:00:00Z' } } },
  ])
  assert.equal(rows[0].id, 'old')
  assert.equal(rows[1].updated_at, null)
})
