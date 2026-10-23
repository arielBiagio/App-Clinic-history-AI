# Historia Clínica IA

A web application for creating and viewing patient assessments from text or
audio notes. AI organizes the information into a structured clinical record
that the professional can review and edit.

## Features

- Register patients and view their assessment history.
- Write notes or record audio to generate structured assessments with AI.
- Edit assessments and sort patients by their most recent activity.
- Use a responsive interface on desktop and mobile.
- Connect an agent through MCP to query authorized information.

Each professional can only access their own patients through authentication and
database access policies.

## Read-only MCP

The MCP server is part of this repository. It lets an agent search for patients,
list the most recent ones, and read their assessments. Connections use OAuth and
have been tested with Sesame.

The agent can use this information to answer questions or produce summaries,
but it cannot create, modify, or delete records through the MCP server.

See [MCP tools and setup](./supabase/README.md).

## Tech stack

- Frontend: React, Vite, and React Router.
- Backend: Node.js, Express, and OpenRouter for AI transcription and structured output.
- Data and authentication: Supabase, PostgreSQL, and Row Level Security.
- MCP: TypeScript, Supabase Edge Functions, and OAuth with PKCE.

## Local development

Setup instructions and example environment variables are available in each folder:

- [Frontend](./frontend/README.md): web interface, port `5173`.
- [Backend](./backend/README.md): application API, port `3001`.
- [Supabase and MCP](./supabase/README.md): agent queries and database migrations.

A personal learning and portfolio project. Use fictional data for demonstrations.
AI-generated clinical records require professional review.
