-- Read-only verification: no patient data or tokens are returned or changed.
begin read only;
do $$
declare
  expected_patients bigint;
  expected_evaluations bigint;
  visible_patients bigint;
  visible_evaluations bigint;
begin
  select count(*) into expected_patients from public.pacientes where profesional_id = '56e22b14-18b3-466e-a251-98b1f3228947';
  select count(*) into expected_evaluations from public.evaluaciones e join public.pacientes p on p.id=e.paciente_id where p.profesional_id='56e22b14-18b3-466e-a251-98b1f3228947';
  perform set_config('request.jwt.claims', '{"sub":"56e22b14-18b3-466e-a251-98b1f3228947","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into visible_patients from public.pacientes;
  select count(*) into visible_evaluations from public.evaluaciones;
  if visible_patients <> expected_patients or visible_evaluations <> expected_evaluations then raise exception 'El propietario no ve todos sus registros'; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
  set local role authenticated;
  if exists(select 1 from public.pacientes) or exists(select 1 from public.evaluaciones) then raise exception 'Un usuario ajeno puede ver registros clínicos'; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"56e22b14-18b3-466e-a251-98b1f3228947","role":"authenticated","client_id":"clinical-mcp-verification"}', true);
  set local role authenticated;
  select count(*) into visible_patients from public.pacientes;
  if visible_patients <> expected_patients then raise exception 'OAuth no conserva el aislamiento por propietario'; end if;
  reset role;
end $$;
commit;
