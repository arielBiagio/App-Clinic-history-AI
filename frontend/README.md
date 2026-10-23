# Historia Clínica IA — Frontend

A React + Vite interface for managing patients, capturing text or audio notes,
viewing and editing assessments, and authorizing MCP connections.

## Local development

```sh
npm ci
cp .env.local.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` in
`.env.local`. The local API uses `http://localhost:3001`, and Vite uses port `5173`.
`VITE_*` variables are public: never include private keys.

## Main routes

- `/login`: sign in.
- `/`: patient list.
- `/nuevo`: notes for a new assessment.
- `/paciente/:id`: patient history.
- `/oauth/consent`: agent authorization.

## Build and tests

```sh
npm test
npm run build
```

The build is generated in `dist/` and can be hosted on Netlify or Cloudflare Pages.
Set `VITE_API_URL` before building. The `_redirects` file supports direct navigation
to application routes.
