# Historia Clínica IA — Backend

API Node.js + Express. Recibe notas de texto o audio, utiliza IA mediante
OpenRouter para transcribir y estructurar evaluaciones, y las guarda en Supabase.

## Desarrollo local

```sh
npm ci
cp .env.example .env
npm run dev
```

Completar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY` y
`FRONTEND_URL`. La API utiliza el puerto `3001` por defecto.
No subir `.env` ni claves privadas al repositorio.

## Endpoints principales

- `GET /health`: estado de la API.
- `GET /api/pacientes`: listado por actividad reciente.
- `GET /api/pacientes/:id`: paciente y evaluaciones.
- `POST /api/evaluaciones`: crea una evaluación con notas de texto o audio.
- `PATCH /api/evaluaciones/:id`: edita una evaluación.
- `DELETE /api/pacientes/:id` y `DELETE /api/evaluaciones/:id`: elimina registros.

Las rutas de datos requieren el JWT del profesional y respetan las políticas RLS.
Los tokens OAuth delegados se rechazan en esta API; el agente utiliza el
[MCP de solo lectura](../supabase/README.md).

## Despliegue

En Render: Node.js 22, directorio `backend`, build `npm ci`, inicio `npm start` y
health check `/health`. Configurar `FRONTEND_URL` con el origen HTTPS del frontend
y dejar que Render asigne `PORT`. Esta API no necesita una clave `service_role`.
