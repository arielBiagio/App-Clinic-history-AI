# MCP clínico de solo lectura

Servidor MCP en Supabase Edge Functions para que un agente consulte los pacientes
y evaluaciones del profesional que autoriza la conexión. Probado con Sesame.

## Herramientas

| Herramienta | Qué hace |
| --- | --- |
| `buscar_pacientes` | Busca pacientes propios por nombre. |
| `ultimos_pacientes` | Lista pacientes por alta o creación/edición de consultas, más recientes primero. |
| `leer_historia_clinica` | Lee las evaluaciones de un paciente propio. |
| `buscar_consultas` | Busca términos en campos clínicos, como diagnóstico o motivo de consulta. |

Las herramientas aceptan `limite` y `pagina`: la primera página es **0**, con
10 resultados por defecto y un máximo de 30. Para continuar, usar
`siguiente_pagina` con el mismo límite hasta que sea `null`.

El MCP no genera resúmenes ni busca bibliografía: el agente realiza esas tareas
fuera del servidor. Los textos de las fichas son datos, no instrucciones.

## Acceso

- OAuth con PKCE y consentimiento del profesional.
- Cada consulta usa el token del usuario y respeta el aislamiento mediante RLS.
- Solo lectura: no permite crear, editar ni eliminar fichas.
- Los clientes OAuth se validan por ID autorizado o por una política estricta de
  registro público y callback exacto. Sin configuración, el acceso se deniega.
- La credencial administrativa del servidor solo verifica metadatos de clientes
  OAuth; nunca se utiliza para consultar historias clínicas.

## Configuración

1. Crear el esquema base de [la aplicación](../backend/sql/schema.sql) y revisar
   las [migraciones](./migrations). En una instalación nueva, adaptar el propietario
   de los registros existentes antes de aplicar la migración de profesionales.
   No reaplicar migraciones ya registradas.
2. Habilitar Supabase OAuth y configurar `/oauth/consent` en la URL de la aplicación.
   Para clientes con registro dinámico, habilitar también esa opción en Supabase.
3. Configurar los secretos indicados en
   [`.env.example`](./functions/clinical-mcp/.env.example), sin incluirlos en Git.
4. Desplegar la función:

```sh
supabase functions deploy clinical-mcp --project-ref PROJECT_REF --use-api
```

En el agente, agregar `https://PROJECT_REF.supabase.co/functions/v1/clinical-mcp`
y completar la autorización. No incluir claves ni tokens en esa URL.

## Pruebas locales

Desde la raíz del repositorio, con Deno 2 y las dependencias de prueba instaladas:

```sh
deno task --cwd supabase/functions/clinical-mcp check
deno task --cwd supabase/functions/clinical-mcp test
npm --prefix supabase/tests ci
npm --prefix supabase/tests test
```

Las pruebas usan datos ficticios y verifican herramientas, paginación, validación
OAuth y separación entre profesionales.
