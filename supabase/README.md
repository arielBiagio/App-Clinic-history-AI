# Read-only clinical MCP

An MCP server running on Supabase Edge Functions. It lets an agent query the
patients and assessments belonging to the professional who authorizes the
connection. Tested with Sesame.

## Tools

| Tool | Purpose |
| --- | --- |
| `buscar_pacientes` | Search the professional's own patients by name. |
| `ultimos_pacientes` | List patients by registration or assessment creation/editing activity, newest first. |
| `leer_historia_clinica` | Read assessments for one of the professional's patients. |
| `buscar_consultas` | Search clinical fields, such as diagnosis or reason for consultation. |

Tools accept `limite` and `pagina`: the first page is **0**, with 10 results by
default and a maximum of 30. To continue, use `siguiente_pagina` with the same
limit until it is `null`.

The MCP server does not generate summaries or search for research papers: the
agent handles those tasks outside the server. Clinical notes are data, not
instructions.

## Access

- OAuth with PKCE and the professional's consent.
- Queries use the user's token and respect tenant isolation through RLS.
- Read-only: no tools for creating, editing, or deleting records.
- OAuth clients are checked against authorized IDs or a strict policy for
  dynamically registered public clients with an exact callback URL.
  Access is denied when no client policy is configured.
- The server's administrative credential only checks OAuth client metadata;
  it is never used to query clinical records.

## Setup

1. Create the [application's base schema](../backend/sql/schema.sql) and review
   the [migrations](./migrations). For a new installation, update the owner of
   existing records before applying the professional isolation migration.
   Do not reapply migrations that are already recorded.
2. Enable Supabase OAuth and configure `/oauth/consent` on the application's URL.
   Enable dynamic client registration in Supabase if the client requires it.
3. Configure the secrets listed in
   [`.env.example`](./functions/clinical-mcp/.env.example). Do not commit them to Git.
4. Deploy the function:

```sh
supabase functions deploy clinical-mcp --project-ref PROJECT_REF --use-api
```

In the agent, add `https://PROJECT_REF.supabase.co/functions/v1/clinical-mcp`
and complete authorization. Do not include keys or tokens in this URL.

## Local tests

From the repository root, with Deno 2 and the test dependencies installed:

```sh
deno task --cwd supabase/functions/clinical-mcp check
deno task --cwd supabase/functions/clinical-mcp test
npm --prefix supabase/tests ci
npm --prefix supabase/tests test
```

Tests use fictional data to verify tools, pagination, OAuth validation, and
isolation between professionals.
