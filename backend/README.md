# Historia Clínica IA — Backend

Node.js + Express. Recibe las notas del frontend, transcribe audios con Whisper
(vía OpenRouter), estructura la evaluación con un LLM (JSON Schema estricto) y
la guarda en Supabase.

## Levantar el proyecto

```bash
npm install
cp .env.example .env
# completá SUPABASE_URL, SUPABASE_ANON_KEY, OPENROUTER_API_KEY
npm run dev
```

Corre por defecto en `http://localhost:3001`.

## Render

- Servicio web Node, rama `main`, directorio raíz `backend`.
- Build: `npm ci`. Inicio: `npm start`. Health check: `/health`.
- Node 22 fijado en `.node-version`; escucha en `0.0.0.0` y usa el `PORT` de Render.
- Variables: `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `OPENROUTER_API_KEY` y `FRONTEND_URL` (origen HTTPS exacto de Cloudflare Pages).
  No configurar `SUPABASE_SERVICE_ROLE_KEY` ni fijar `PORT=3001`.
- `node scripts/prepare-render-env.mjs` genera un archivo ignorado con las
  variables necesarias para importar en Render. El origen inicial es localhost;
  actualizar `FRONTEND_URL` al publicar el frontend y eliminar el archivo local.
- El plan gratuito entra en suspensión por inactividad; el primer pedido puede
  demorar mientras vuelve a arrancar.

## Endpoints

- `GET /health` — chequeo simple, sin auth
- `GET /api/pacientes` — lista de pacientes + fecha de última evaluación (requiere auth)
- `GET /api/pacientes/:id` — paciente + todas sus evaluaciones (requiere auth)
- `POST /api/evaluaciones` — crea una evaluación completa (requiere auth)

Todas las rutas protegidas esperan `Authorization: Bearer <token>`, con el JWT
que el frontend obtiene de Supabase Auth tras el login.

## Contrato de `POST /api/evaluaciones` (multipart/form-data)

- `nombre` — string, solo si es un paciente nuevo
- `pacienteId` — string (uuid), solo si es una evaluación para un paciente existente
- `notas` — JSON.stringify de un array:
  ```js
  [
    { tipo: 'texto', contenido: 'paciente refiere dolor...' },
    { tipo: 'audio', audioFieldName: 'audio_1' }
  ]
  ```
- un archivo por cada nota de audio, con `fieldname` igual a su `audioFieldName`

El backend transcribe cada audio, borra el archivo temporal apenas lo usa,
concatena todo en orden, llama al LLM con el JSON Schema definido en
`src/lib/schema.js`, y guarda el resultado en la tabla `evaluaciones`.

## Seguridad

- Las consultas usan el JWT del profesional y respetan RLS. Aplicar la migración
  de propietarios indicada en [la guía MCP](../supabase/README.md) para activar
  el aislamiento entre profesionales. La API ya no necesita `service_role`.
- Los tokens OAuth delegados solo pueden usar el MCP; la API Express los rechaza.
- La key de OpenRouter también vive solo acá.

## Próximos pasos

1. Crear las tablas `pacientes` y `evaluaciones` en Supabase (SQL ya definido)
2. Completar `.env`
3. Conectar el frontend: reemplazar el mock de `useNotasEvaluacion`/`CapturaPaciente`
   para armar el `FormData` según el contrato de arriba, mandando el JWT de
   `supabase.auth.getSession()` en el header `Authorization`
4. Reemplazar `pacientesMock` en el frontend por `fetch` a `/api/pacientes` y `/api/pacientes/:id`
