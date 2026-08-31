-- Ejecutar en Supabase: Dashboard > SQL Editor > New query

create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

create table if not exists evaluaciones (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  contenido jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists evaluaciones_paciente_id_idx on evaluaciones(paciente_id);

-- Row Level Security: solo usuarios autenticados pueden leer/escribir.
-- El backend usa la service_role key y salta esto a propósito (ya valida
-- el JWT él mismo en el middleware). Esto es una segunda capa de defensa
-- por si en algún momento el frontend consultara Supabase directo.
alter table pacientes enable row level security;
alter table evaluaciones enable row level security;

create policy "authenticated puede todo en pacientes"
  on pacientes for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated puede todo en evaluaciones"
  on evaluaciones for all
  to authenticated
  using (true)
  with check (true);
