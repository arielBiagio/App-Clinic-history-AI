# Historia Clínica IA

A web application for organizing patients and clinical assessments from text and voice notes. Built around a physiotherapy workflow, it turns consultation notes into structured records that the professional can review and edit.

[Open the app](https://my-ai-clinic.netlify.app/login) · [GitHub repository](https://github.com/arielBiagio/App-Clinic-history-AI)

The app requires an authorized account. The current interface and clinical prompts are in Spanish.

## Features

- Email and password sign-in with Supabase Auth.
- Patient search by name and a list ordered by the latest registration, assessment, or edit.
- Multiple text and voice notes for a new patient or a follow-up assessment.
- AI-assisted transcription and structured assessment creation.
- Patient history with assessment dates, editable clinical fields, and edit indicators.
- Assessment and patient deletion, with confirmation in the interface.
- Responsive layouts, loading states, and transitions between sections.
- Read-only access from compatible agents through an OAuth-authorized MCP server.

## Tech stack

- **Frontend:** React, JavaScript, Vite, React Router, CSS, and the browser's MediaRecorder API.
- **Backend:** Node.js, Express, Multer for audio uploads, and OpenRouter for AI requests.
- **Data and authentication:** Supabase Auth and PostgreSQL with Row Level Security (RLS).
- **MCP:** TypeScript, Deno, the MCP server SDK, Zod, and Supabase Edge Functions.
- **Hosting:** Netlify for the frontend, Render for the API, and Supabase for data, authentication, and MCP.

## Architecture

```text
React frontend ── sign-in and consent ──> Supabase Auth
      │
      │ user JWT + text/audio notes
      ▼
Express API ── user-scoped queries ─────> PostgreSQL + RLS
      │
      └── transcription and structuring ─> OpenRouter

External agent ── OAuth ──> MCP Edge Function ── user-scoped queries ──> PostgreSQL + RLS
```

The frontend obtains a Supabase session and sends its access token to Express. The API validates the user and accesses the database with that token, rather than using an administrative database client.

Patients belong to a professional; their assessments inherit that ownership. PostgreSQL stores patient metadata separately from the assessment's clinical JSON content. The MCP uses the same ownership rules without routing agent requests through the application's write API.

## AI-assisted clinical capture

1. The professional collects text and voice notes for one assessment.
2. The backend sends audio to the configured Whisper transcription endpoint through OpenRouter.
3. GPT-4o is requested to correct transcription errors before extraction.
4. The backend combines the current assessment's notes in their original order and requests structured output from GPT-4o using a JSON Schema.
5. The result is stored as an assessment and becomes available for manual review and editing.

The schema covers the reason for consultation, age, symptom onset, pain score, history, examination, diagnosis, treatment plan, and additional observations. Fields accept `null`; prompts instruct the model not to fill gaps with unsupported clinical assumptions. These constraints do not guarantee clinical accuracy.

Only the submitted assessment notes are sent to the structuring request; the patient's full history is not automatically added. The capture pipeline does not implement automatic chunking, summarization, or a token budget for long submissions.

Audio uses temporary server files, with cleanup scheduled after processing. Notes and audio are processed by OpenRouter and its configured model providers. Automatic de-identification is not implemented.

## Agent integration: MCP

The remote MCP server exposes four read-only tools over stateless Streamable HTTP. It has been used with Sesame to retrieve authorized records for questions and summaries.

| Tool | Purpose |
| --- | --- |
| `buscar_pacientes` | Find the professional's patients by name; return identifiers, names, and registration dates for disambiguation. |
| `ultimos_pacientes` | List patients by their latest registration, assessment creation, or edit, newest first; include patients without assessments. |
| `leer_historia_clinica` | Read one patient's assessments, ordered by assessment creation date, with creation and editing dates kept separate. |
| `buscar_consultas` | Search a literal term in a supported clinical field, such as diagnosis, reason for consultation, history, examination, or treatment plan. |

The MCP retrieves information; it does not call a language model, save agent-generated summaries, or search medical literature. Those tasks belong to the connected agent. Clinical search is field-based and case-insensitive, not embedding-based or semantic retrieval.

### Context selection and pagination

- Patient lookup and recent activity return metadata, not complete clinical histories.
- Clinical search returns the matching field rather than every field in the assessment.
- History retrieval returns a defined set of clinical fields and excludes internal editing metadata.
- Tools return 10 results by default, with a maximum of 30 per call.
- The first page is `pagina=0`. Continue using `siguiente_pagina` with the same `limite`; stop when it is `null`.
- Use `leer_historia_clinica` with `limite=3` for the latest three assessments. A full history requires following every page.

This keeps individual responses bounded without claiming that a partial result is the complete history. Recent-patient ordering is calculated in SQL before pagination. Pages are not a snapshot: new records or edits can change their contents between calls.

### Authentication and permissions

OAuth uses Authorization Code with PKCE and a consent screen in the app. The MCP verifies the JWT and checks the issuing project, audience, expiry, role, and OAuth client.

Clients must match an explicit client-ID allowlist or a configured policy for dynamically registered public clients with a single exact callback URL. Requests are denied if neither policy allows the client.

Data queries use the professional's token and remain subject to RLS. Additional policies block OAuth-token writes to patients and assessments, and Express rejects delegated OAuth tokens. The server's administrative credential is used only to inspect registered OAuth client metadata, never to retrieve clinical records.

Authorizing an agent allows that client to receive the returned clinical information. Tool descriptions treat note contents as untrusted data, not instructions. Revoking refresh access alone does not guarantee immediate invalidation of an already issued access token.

## Design decisions

- **Flexible capture, structured storage:** free-form notes are easier to collect during a consultation; a defined JSON Schema gives the interface consistent clinical fields.
- **Editable AI output:** generated assessments can be corrected by the professional instead of being treated as verified clinical conclusions.
- **Database-enforced ownership:** user-scoped clients and RLS apply the same patient boundaries to the application and the MCP.
- **Separate application and agent interfaces:** Express handles capture and editing; the MCP offers specific read tools instead of generic database or write access.
- **Bounded retrieval:** targeted fields, pagination, and SQL aggregation avoid passing the entire patient dataset to an agent for simple queries.
- **Separate creation and editing dates:** recent activity reflects changes without presenting an edit as a new consultation.

## Local development

Requires Node.js 22.12 or newer, npm, a Supabase project, and an OpenRouter key with access to the configured models and endpoints. Audio recording requires microphone permission and a browser supporting WebM recording in a secure context, such as HTTPS or localhost.

### 1. Install dependencies

```sh
git clone https://github.com/arielBiagio/App-Clinic-history-AI.git
cd App-Clinic-history-AI
npm --prefix backend ci
npm --prefix frontend ci
```

### 2. Prepare Supabase

For a new installation, run `backend/sql/schema.sql` in the Supabase SQL Editor, then apply the SQL files in `supabase/migrations/` in version order. The base schema alone does not enforce ownership isolation.

If importing existing records, review and replace `legacy_owner` in the professional-ownership migration with the appropriate account for that installation before running it. Do not reapply migrations to an already configured database.

Create a professional account in Supabase Auth. The application has sign-in, but no self-service registration or user-management screen.

### 3. Configure environment variables

Create `backend/.env`:

```dotenv
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=replace_with_your_public_anon_key
OPENROUTER_API_KEY=replace_with_your_openrouter_key
```

Create `frontend/.env.local`:

```dotenv
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=replace_with_your_public_anon_key
```

These values are placeholders. Use the same Supabase project in both files. All `VITE_*` variables are public; never put an OpenRouter key, a secret key, or a `service_role` key there. Express does not require `service_role`.

### 4. Start the app

Run each command in a separate terminal from the repository root:

```sh
npm --prefix backend run dev
```

```sh
npm --prefix frontend run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:3001`; `GET /health` provides a basic health check.

## Deployment

### Frontend and API

- **Render:** use Node.js 22, root directory `backend`, build command `npm ci`, start command `npm start`, and health check `/health`. Configure the backend variables above, set `NODE_ENV=production` and `FRONTEND_URL` to the frontend's exact HTTPS origin, and let Render assign `PORT`.
- **Netlify or another static host:** set the frontend variables before building, then run `npm --prefix frontend run build` and publish `frontend/dist`. The included `_redirects` file supports direct navigation to React routes.
- **Build configuration:** `frontend/.env.production` defines a default production API URL. Override `VITE_API_URL` for your deployment before building; changing hosting variables after uploading a static build does not rewrite that build.

### Optional MCP deployment

Requires Deno 2 for local MCP checks and the Supabase CLI for deployment.

Enable the Supabase OAuth server, set the Site URL to your frontend origin, and set the authorization path to `/oauth/consent`. Enable dynamic client registration only if required by the agent, and configure an allowed client policy.

Set the following as Edge Function secrets, replacing the fictional values with your own project and authorized client configuration:

```dotenv
MCP_RESOURCE_URL=https://your-project.supabase.co/functions/v1/clinical-mcp
MCP_ALLOWED_CLIENT_IDS=
MCP_TRUSTED_PUBLIC_REDIRECT_URIS=https://agent.example.org/oauth/callback
MCP_ALLOWED_ORIGINS=
```

Use `MCP_ALLOWED_CLIENT_IDS` for explicit client IDs or `MCP_TRUSTED_PUBLIC_REDIRECT_URIS` for the dynamic-public-client policy. Browser clients need their exact origin in `MCP_ALLOWED_ORIGINS`; server-to-server requests without an Origin header do not.

Supabase injects its project credentials into the Edge Function. Do not copy its administrative credential into the frontend or Express environment.

```sh
supabase login
supabase functions deploy clinical-mcp --project-ref YOUR_PROJECT_REF --use-api
```

The function's gateway JWT check is disabled only to allow public OAuth discovery. Authenticated MCP calls are still verified inside the handler. Add the HTTPS resource URL to the agent and complete sign-in and consent; do not place tokens in the URL.

## Development checks

From the repository root:

```sh
npm --prefix frontend run lint
npm --prefix frontend test
node --test backend/src/server.test.js backend/src/lib/actividad.test.js
npm --prefix supabase/tests ci
npm --prefix supabase/tests test
deno task --cwd supabase/functions/clinical-mcp check
deno task --cwd supabase/functions/clinical-mcp test
```

## Current scope

The app does not implement granular clinical roles, shared-patient teams, an immutable revision history, or offline synchronization. Editing replaces the current assessment content while retaining creation and latest-edit timestamps.

Use fictional data for portfolio demonstrations. This project does not claim clinical validation or healthcare regulatory certification; AI-generated documentation requires professional review.
