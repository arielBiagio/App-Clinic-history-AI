# Historia Clínica IA — Backend

A Node.js + Express API. It receives text or audio notes, uses AI through
OpenRouter to transcribe and structure assessments, and stores them in Supabase.

## Local development

```sh
npm ci
cp .env.example .env
npm run dev
```

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`, and
`FRONTEND_URL`. The API uses port `3001` by default.
Do not commit `.env` or private keys to the repository.

## Main endpoints

- `GET /health`: API health check.
- `GET /api/pacientes`: patients sorted by recent activity.
- `GET /api/pacientes/:id`: a patient and their assessments.
- `POST /api/evaluaciones`: create an assessment from text or audio notes.
- `PATCH /api/evaluaciones/:id`: edit an assessment.
- `DELETE /api/pacientes/:id` and `DELETE /api/evaluaciones/:id`: delete records.

Data endpoints require the professional's JWT and respect RLS policies.
Delegated OAuth tokens are rejected by this API; agents use the
[read-only MCP server](../supabase/README.md).

## Deployment

On Render: Node.js 22, root directory `backend`, build command `npm ci`, start
command `npm start`, and health check `/health`. Set `FRONTEND_URL` to the
frontend's exact HTTPS origin and let Render assign `PORT`.
This API does not require a `service_role` key.
