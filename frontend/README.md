# Historia Clínica IA — Frontend

Interfaz React + Vite para gestionar pacientes, registrar notas de texto o audio,
consultar y editar evaluaciones, y autorizar conexiones MCP.

## Desarrollo local

```sh
npm ci
cp .env.local.example .env.local
npm run dev
```

Completar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_API_URL` en
`.env.local`. La API local utiliza `http://localhost:3001` y Vite el puerto `5173`.
Las variables `VITE_*` son públicas: nunca incluir claves privadas.

## Rutas principales

- `/login`: inicio de sesión.
- `/`: listado de pacientes.
- `/nuevo`: notas para una nueva evaluación.
- `/paciente/:id`: historial del paciente.
- `/oauth/consent`: autorización de un agente.

## Build y pruebas

```sh
npm test
npm run build
```

El build se genera en `dist/` y puede publicarse en Netlify o Cloudflare Pages.
Configurar `VITE_API_URL` antes de compilar. El archivo `_redirects` permite abrir
directamente las rutas de la aplicación.
