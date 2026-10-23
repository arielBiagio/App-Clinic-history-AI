# Historia Clínica IA

Aplicación web para registrar y consultar evaluaciones de pacientes a partir de
notas de texto o audio. La IA organiza la información en una ficha clínica que el
profesional puede revisar y editar.

## Qué permite hacer

- Registrar pacientes y consultar su historial de evaluaciones.
- Escribir notas o grabar audio para generar fichas estructuradas con IA.
- Editar evaluaciones y ordenar pacientes por su actividad más reciente.
- Usar una interfaz adaptada a escritorio y móvil.
- Conectar un agente mediante MCP para consultar la información autorizada.

Cada profesional accede únicamente a sus pacientes mediante autenticación y
políticas de acceso en la base de datos.

## MCP de solo lectura

El servidor MCP está integrado en este repositorio y permite a un agente buscar
pacientes, listar los más recientes y leer sus consultas. La conexión utiliza
OAuth y fue probada con Sesame.

El agente puede usar esa información para responder preguntas o elaborar
resúmenes, pero no puede crear, modificar ni eliminar fichas mediante el MCP.

Ver [herramientas y configuración del MCP](./supabase/README.md).

## Tecnologías

- Frontend: React, Vite y React Router.
- Backend: Node.js, Express y OpenRouter para transcripción y estructuración con IA.
- Datos y autenticación: Supabase, PostgreSQL y Row Level Security.
- MCP: TypeScript, Supabase Edge Functions y OAuth con PKCE.

## Desarrollo local

Las instrucciones y variables de ejemplo están en cada carpeta:

- [Frontend](./frontend/README.md): interfaz web, puerto `5173`.
- [Backend](./backend/README.md): API de la aplicación, puerto `3001`.
- [Supabase y MCP](./supabase/README.md): consultas para agentes y migraciones.

Proyecto personal de aprendizaje y portfolio. Para demostraciones, usar datos
ficticios. Las fichas generadas con IA requieren revisión profesional.
