# Historia Clínica IA

Proyecto personal (portfolio) de un kinesiólogo que digitaliza la carga de
evaluaciones de pacientes usando IA: el profesional dicta o escribe notas
sueltas durante la consulta, y un LLM las estructura automáticamente en una
ficha clínica estándar — sin inventar datos que no fueron mencionados.

## Motivación

En kinesiología (y en salud en general), cargar la historia clínica a mano
después de cada consulta es lento y repetitivo. La idea de este proyecto es
que el profesional pueda anotar información en el momento (texto o audio, en
cualquier orden, tantas veces como necesite) y que la IA arme la ficha
estructurada — dejando explícitamente en blanco lo que no se mencionó, en vez
de completar con supuestos.

## Cómo funciona

1. El profesional inicia una evaluación (paciente nuevo o uno existente) y va
   agregando "notas sueltas": texto rápido o grabaciones de audio.
2. Al guardar, el backend transcribe cada audio (Whisper), corrige errores de
   reconocimiento con una segunda pasada de IA, y recién ahí estructura todo
   el contenido en un JSON con un schema estricto (`temperature` baja,
   campos `null` cuando el dato no está explícito en las notas).
3. La ficha queda guardada en la base de datos y disponible para consultar,
   con historial completo por paciente (tabs por fecha de evaluación).

## Stack

**Frontend** — `/frontend`
- React + Vite + React Router
- Supabase Auth (single-user, sin pantalla de registro)
- `MediaRecorder` nativo del navegador para grabar audio

**Backend** — `/backend`
- Node.js + Express
- Supabase (Postgres + Row Level Security) para persistencia
- OpenRouter como proveedor de IA: Whisper para transcripción, LLM con
  structured outputs (JSON Schema estricto) para la extracción de campos

## Principios de diseño

- **Cero alucinación en contexto clínico**: cada campo del formulario acepta
  `null`. El prompt prohíbe explícitamente inventar o inferir datos que no
  estén dichos de forma explícita en las notas.
- **Seguridad de credenciales**: la key de OpenRouter y la `service_role key`
  de Supabase viven solo en el backend, nunca se exponen al navegador. El
  frontend solo tiene la `anon key`, protegida por Row Level Security.
- **El audio no se persiste**: se transcribe y se borra inmediatamente del
  servidor.

## Correr el proyecto localmente

Ver el README de cada carpeta para el detalle completo de variables de
entorno y comandos:
- [`/frontend/README.md`](./frontend/README.md)
- [`/backend/README.md`](./backend/README.md)

En resumen, hacen falta dos terminales corriendo en paralelo (backend en
`:3001`, frontend en `:5173`), más un proyecto de Supabase con las tablas de
`/backend/sql/schema.sql` ya creadas.

## Estado del proyecto

Proyecto de aprendizaje/portfolio, en desarrollo activo. No está pensado para
uso clínico real con datos de pacientes reales tal como está — es una
demostración de integración full-stack con IA.
