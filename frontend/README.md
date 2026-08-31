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
