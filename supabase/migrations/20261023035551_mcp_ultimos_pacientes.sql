begin;

-- Only a read model: no data writes, ownership changes or new RLS policies.
-- SECURITY INVOKER keeps both underlying tables subject to the caller's RLS.
create function public.mcp_ultimos_pacientes(p_limite integer default 10, p_pagina integer default 0)
returns table (
  id uuid, nombre text, fecha_alta timestamptz, ultima_consulta timestamptz,
  ultima_edicion timestamptz, ultima_actividad timestamptz
)
language plpgsql stable security invoker
set search_path = ''
set timezone = 'UTC'
as $$
begin
  if p_limite is null or p_limite not between 1 and 30
     or p_pagina is null or p_pagina not between 0 and 10000 then
    raise exception 'Parámetros de paginación inválidos' using errcode = '22023';
  end if;
  return query
    select p.id, p.nombre, p.created_at, resumen.ultima_consulta,
           resumen.ultima_edicion, actividad.ultima_actividad
    from public.pacientes p
    left join lateral (
      select max(f.created_at) as ultima_consulta,
             max(case when f.editada > f.created_at then f.editada end) as ultima_edicion
      from (
        select e.created_at, greatest(e.updated_at,
          case when (e.contenido #>> '{_meta,updated_at}') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(T| )'
            and pg_catalog.pg_input_is_valid(e.contenido #>> '{_meta,updated_at}', 'timestamp with time zone')
          then (e.contenido #>> '{_meta,updated_at}')::timestamptz end
        ) as editada
        from public.evaluaciones e where e.paciente_id = p.id
      ) f
    ) resumen on true
    cross join lateral (
      select greatest(p.created_at, resumen.ultima_consulta, resumen.ultima_edicion) as ultima_actividad
    ) actividad
    where p.profesional_id = (select auth.uid())
    order by actividad.ultima_actividad desc, p.id asc
    -- One sentinel row lets the MCP report whether there is another page.
    limit p_limite + 1 offset p_pagina * p_limite;
end;
$$;

revoke all on function public.mcp_ultimos_pacientes(integer, integer) from public, anon;
grant execute on function public.mcp_ultimos_pacientes(integer, integer) to authenticated;
comment on function public.mcp_ultimos_pacientes(integer, integer) is
  'Solo lectura; pacientes propios por actividad más reciente. RLS del invocador; una fila centinela adicional para paginación.';
notify pgrst, 'reload schema';
commit;
