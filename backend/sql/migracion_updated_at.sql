-- Correr esto en el SQL Editor de Supabase (una sola vez).
-- Agrega la columna que faltaba para poder distinguir "creado" de "modificado".

alter table evaluaciones
  add column if not exists updated_at timestamptz not null default now();

-- Inicializa updated_at = created_at en las filas que ya existen,
-- para que no queden todas con la fecha de HOY por el default de arriba.
update evaluaciones
set updated_at = created_at
where updated_at is distinct from created_at;

-- Trigger que de ahora en más actualiza updated_at solo en cada UPDATE.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists evaluaciones_set_updated_at on evaluaciones;
create trigger evaluaciones_set_updated_at
  before update on evaluaciones
  for each row
  execute function set_updated_at();
