import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('últimos pacientes ordena antes de paginar, respeta RLS y no expone contenido', async () => {
  const db = new PGlite()
  const owner = '11111111-1111-4111-8111-111111111111'
  const other = '22222222-2222-4222-8222-222222222222'
  const ids = [owner, ...[3, 4, 5, 6, 7].map(n => `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${String(n).repeat(12)}`)]
  try {
    await db.exec(`create schema auth; create role authenticated; create role anon;
      create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}');
      create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims',true)::jsonb $$;`)
    await db.exec(await readFile(new URL('../../backend/sql/schema.sql', import.meta.url), 'utf8'))
    const tenant = await readFile(new URL('../migrations/202610220001_profesionales_mcp.sql', import.meta.url), 'utf8')
    await db.exec(tenant.replace(/legacy_owner uuid := '[0-9a-f-]+'/i, `legacy_owner uuid := '${owner}'`))
    await db.exec(`grant usage on schema public,auth to authenticated,anon;
      grant select,insert,update,delete on public.pacientes,public.evaluaciones to authenticated;`)
    const dates = ['2026-08-01', '2026-10-05', '2026-10-07', '2026-10-07', '2026-09-01', '2026-09-03']
    for (let i = 0; i < ids.length; i++) {
      await db.query('insert into pacientes(id,nombre,profesional_id,created_at) values($1,$2,$3,$4)', [ids[i], `Ficticio ${i}`, owner, dates[i]])
    }
    await db.query('insert into pacientes(id,nombre,profesional_id,created_at) values($1,$2,$3,$4)', [other, 'Ajeno', other, '2026-10-20'])
    for (const [id, created, updated, content] of [
      [ids[0], '2026-08-02', '2026-10-10', {}], [ids[0], '2026-10-01', '2026-10-01', {}],
      [ids[4], '2026-09-02', '2026-09-02', { _meta: { updated_at: '2026-10-09T00:00:00Z' } }],
      [ids[5], '2026-09-04', '2026-09-04', { diagnostico: 'NO EXPORTAR', _meta: { updated_at: '2026-02-30T00:00:00Z' } }],
      [other, '2026-10-21', '2026-10-21', {}],
    ]) await db.query('insert into evaluaciones(paciente_id,created_at,updated_at,contenido) values($1,$2,$3,$4)', [id, created, updated, JSON.stringify(content)])
    await db.exec(await readFile(new URL('../migrations/20261023035551_mcp_ultimos_pacientes.sql', import.meta.url), 'utf8'))
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: owner, client_id: 'sesame-test' })])
    await db.exec('set role authenticated')
    const all = (await db.query('select * from public.mcp_ultimos_pacientes(30,0)')).rows
    assert.deepEqual(all.map(row => row.id), [ids[0], ids[4], ids[2], ids[3], ids[1], ids[5]])
    assert.equal(all[0].ultima_consulta.toISOString(), '2026-10-01T00:00:00.000Z')
    assert.equal(all[0].ultima_edicion.toISOString(), '2026-10-10T00:00:00.000Z')
    assert.equal(all[2].ultima_consulta, null)
    assert.equal(all[2].ultima_edicion, null)
    assert.equal(all[5].ultima_edicion, null, 'Fecha metadata inválida se ignora')
    assert.deepEqual(Object.keys(all[0]).sort(), ['id', 'nombre', 'fecha_alta', 'ultima_consulta', 'ultima_edicion', 'ultima_actividad'].sort())
    const page0 = (await db.query('select * from public.mcp_ultimos_pacientes(2,0)')).rows
    const page1 = (await db.query('select * from public.mcp_ultimos_pacientes(2,1)')).rows
    assert.deepEqual(page0.map(row => row.id), all.slice(0, 3).map(row => row.id), 'Incluye un centinela para siguiente página')
    assert.deepEqual(page1.map(row => row.id), all.slice(2, 5).map(row => row.id))
    assert.equal((await db.query('select * from public.mcp_ultimos_pacientes(2,10)')).rows.length, 0)
    for (const args of ['0,0', '31,0', '2,-1', '2,10001', 'null,0', '2,null']) {
      await assert.rejects(db.query(`select * from public.mcp_ultimos_pacientes(${args})`), /Parámetros de paginación inválidos/)
    }
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: other, client_id: 'sesame-test' })])
    await db.exec('set role authenticated')
    assert.deepEqual((await db.query('select * from public.mcp_ultimos_pacientes()')).rows.map(row => row.id), [other])
    await db.exec('reset role; set role anon')
    await assert.rejects(db.query('select * from public.mcp_ultimos_pacientes()'), /permission denied/)
  } finally { await db.close() }
})
