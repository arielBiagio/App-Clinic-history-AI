-- Run once against the existing application schema, after assigning the UUID below.
-- Transaction aborts without changes if the legacy owner was not specified.
begin;
alter table public.pacientes add column if not exists profesional_id uuid references auth.users(id);
do $$
declare legacy_owner uuid := '56e22b14-18b3-466e-a251-98b1f3228947'; -- Propietario confirmado de los pacientes existentes.
begin
  if exists(select 1 from public.pacientes where profesional_id is null) then
    if legacy_owner is null then raise exception 'Asignar legacy_owner antes de migrar los pacientes existentes'; end if;
    if not exists(select 1 from auth.users where id = legacy_owner) then raise exception 'Profesional inexistente'; end if;
    update public.pacientes set profesional_id = legacy_owner where profesional_id is null;
  end if;
end $$;
alter table public.pacientes alter column profesional_id set not null;
alter table public.pacientes alter column profesional_id set default auth.uid();
create index if not exists pacientes_profesional_id_idx on public.pacientes(profesional_id);

-- Restrictive policies are ANDed with every existing permissive policy.
-- They protect direct Data API calls as well as the MCP user-scoped client.
create policy profesional_pacientes on public.pacientes as restrictive for all to authenticated
  using (profesional_id = (select auth.uid()))
  with check (profesional_id = (select auth.uid()));
create policy profesional_evaluaciones on public.evaluaciones as restrictive for all to authenticated
  using (exists(select 1 from public.pacientes p where p.id = paciente_id and p.profesional_id = (select auth.uid())))
  with check (exists(select 1 from public.pacientes p where p.id = paciente_id and p.profesional_id = (select auth.uid())));

-- OAuth tokens must never inherit the existing authenticated FOR ALL write grant.
create policy oauth_no_insert_pacientes on public.pacientes as restrictive for insert to authenticated
  with check ((select auth.jwt()->>'client_id') is null);
create policy oauth_no_update_pacientes on public.pacientes as restrictive for update to authenticated
  using ((select auth.jwt()->>'client_id') is null) with check ((select auth.jwt()->>'client_id') is null);
create policy oauth_no_delete_pacientes on public.pacientes as restrictive for delete to authenticated
  using ((select auth.jwt()->>'client_id') is null);
create policy oauth_no_insert_evaluaciones on public.evaluaciones as restrictive for insert to authenticated
  with check ((select auth.jwt()->>'client_id') is null);
create policy oauth_no_update_evaluaciones on public.evaluaciones as restrictive for update to authenticated
  using ((select auth.jwt()->>'client_id') is null) with check ((select auth.jwt()->>'client_id') is null);
create policy oauth_no_delete_evaluaciones on public.evaluaciones as restrictive for delete to authenticated
  using ((select auth.jwt()->>'client_id') is null);
commit;
