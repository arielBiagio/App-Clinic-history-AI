# Historia Clínica IA

Scaffold inicial: React + Vite + React Router + Supabase JS client.

## Levantar el proyecto

```bash
npm install
cp .env.local.example .env.local
# completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (Supabase > Settings > API)
npm run dev
```

## Estructura

```
src/
  pages/        ListaPacientes, CapturaPaciente, DetallePaciente (placeholders)
  components/   NotaItem, ModalNuevoPaciente (placeholders)
  hooks/        useNotasEvaluacion (manejo del array de notas sueltas)
  lib/          supabaseClient.js
```

## Rutas

- `/` — lista de pacientes
- `/nuevo` — captura de notas (texto/audio) para un nuevo paciente
- `/paciente/:id` — detalle e historial de evaluaciones de un paciente

## Próximos pasos

1. Crear el proyecto en Supabase y correr el SQL de las tablas `pacientes` y `evaluaciones`
2. Completar `.env.local`
3. Implementar `ListaPacientes` contra Supabase (auth + fetch de pacientes)
4. Implementar la lógica real de `useNotasEvaluacion` + grabación de audio (`MediaRecorder`)
5. Backend: endpoint que reciba las notas, transcriba con Whisper (OpenRouter), estructure con el LLM (JSON Schema definido) y guarde en Supabase
# Subida manual a Cloudflare Pages

El build actual está en `dist/` y el paquete de subida en
`historia-clinica-cloudflare.zip`. El ZIP contiene `index.html` en la raíz y
`_redirects` para las rutas React, incluida `/oauth/consent`.

Esta compilación usa el backend Express publicado en
`https://historia-clinica-api-9a5t.onrender.com`, configurado en `.env.production`.
El MCP en Supabase es independiente de ese backend. Esto no cambia el desarrollo
con `.env.local`. Una vez publicada la SPA, configurar en Render `FRONTEND_URL`
con el origen HTTPS exacto de Pages y desplegar la configuración, para permitir
las llamadas de la app mediante CORS. Hasta entonces solo se permite localhost.

Para cambiar de backend, configurar `VITE_API_URL` con la nueva URL en
`.env.production` o en el entorno de compilación y volver a ejecutar
`npm run build`. Como se trata de un build estático Vite, cambiar variables en
Cloudflare después de subir el ZIP no modifica los archivos ya compilados.

En Cloudflare Pages usar Direct Upload y subir el ZIP o el contenido de `dist/`.
Después, usar la URL `https://...pages.dev` para configurar el Site URL de Supabase
y `/oauth/consent` como Authorization Path.
