import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'
test('RLS separa profesionales y bloquea escrituras OAuth incluso fuera del MCP', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create schema auth; create role authenticated;
      create table auth.users(id uuid primary key); insert into auth.users values('${a}'),('${b}');
      create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims',true)::jsonb $$;`)
    await db.exec(await readFile(new URL('../../backend/sql/schema.sql', import.meta.url), 'utf8'))
    await db.exec(`insert into public.pacientes(id,nombre) values ('${a}','Legacy A');`)
    const migration = await readFile(new URL('../migrations/202610220001_profesionales_mcp.sql', import.meta.url), 'utf8')
    await db.exec(migration.replace(/legacy_owner uuid := (?:null|'[0-9a-f-]+')/i, `legacy_owner uuid := '${a}'`))
    await db.exec(`grant usage on schema public,auth to authenticated; grant all on public.pacientes,public.evaluaciones to authenticated;
      insert into public.pacientes(id,nombre,profesional_id) values('${b}','Patient B','${b}');
      insert into public.evaluaciones(id,paciente_id,contenido) values('${a}','${a}','{}'),('${b}','${b}','{}');`)
    const login = async (sub, client) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub, ...(client ? { client_id: client } : {}) })])
      await db.exec('set role authenticated')
    }
    await login(a, 'sesame-test')
    assert.deepEqual((await db.query('select id from pacientes')).rows.map(p => p.id), [a])
    assert.deepEqual((await db.query('select id from evaluaciones')).rows.map(e => e.id), [a])
    assert.equal((await db.query(`select * from evaluaciones where id='${b}'`)).rows.length, 0)
    assert.equal((await db.query(`update evaluaciones set contenido='{"edad":2}' where id='${a}' returning id`)).rows.length, 0)
    assert.equal((await db.query(`delete from pacientes where id='${a}' returning id`)).rows.length, 0)
    await assert.rejects(db.query(`insert into pacientes(nombre) values('OAuth forbidden')`), /row-level security/)
    await assert.rejects(db.query(`insert into evaluaciones(paciente_id,contenido) values('${a}','{}')`), /row-level security/)
    await login(b)
    assert.deepEqual((await db.query('select id from pacientes')).rows.map(p => p.id), [b])
    assert.equal((await db.query(`update evaluaciones set contenido='{"edad":3}' where id='${b}' returning id`)).rows.length, 1)
    await assert.rejects(db.query(`insert into evaluaciones(paciente_id,contenido) values('${a}','{}')`), /row-level security/)
    await login(a)
    const row = await db.query("insert into pacientes(nombre) values('New own patient') returning profesional_id")
    assert.equal(row.rows[0].profesional_id, a)
  } finally { await db.close() }
})
