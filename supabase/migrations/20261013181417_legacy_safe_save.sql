-- Ejecutar SOLO tras comprobar que ambas tablas tienen PK simple id y congelar clientes antiguos.
-- Evita upserts masivos desactualizados, preserva columnas desconocidas y guarda ambas colecciones atómicamente.
begin;
do $$
declare table_name text;
begin
  foreach table_name in array array['hipotesis','clientes'] loop
    if not exists (
      select 1 from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
      where c.conrelid=to_regclass('public.'||table_name) and c.contype='p' and cardinality(c.conkey)=1 and a.attname='id'
    ) then raise exception 'Preflight falló: %.id debe ser PK simple', table_name; end if;
  end loop;
end;
$$;
create table public.subtek_legacy_history (
  id bigint generated always as identity primary key,
  collection text not null,
  record_id text not null,
  previous_snapshot jsonb,
  saved_snapshot jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null
);
alter table public.subtek_legacy_history enable row level security;
revoke all on public.subtek_legacy_history from public,anon,authenticated;
grant select on public.subtek_legacy_history to authenticated;
create policy legacy_history_member_read on public.subtek_legacy_history for select to authenticated
  using(exists(select 1 from public.subtek_config_members where user_id=(select auth.uid())));
create function subtek_private._subtek_apply_legacy(p_table text,p_base jsonb,p_draft jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  item jsonb; expected jsonb; actual jsonb; saved jsonb;
  cols text; vals text; assignments text; result jsonb := '[]'::jsonb;
begin
  if p_table not in ('hipotesis','clientes') or jsonb_typeof(p_base) is distinct from 'array' or jsonb_typeof(p_draft) is distinct from 'array' then
    raise exception 'Colección inválida' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(p_draft) as j where jsonb_typeof(j) <> 'object' or coalesce(j->>'id','')='')
    or (select count(*) from jsonb_array_elements(p_draft)) <> (select count(distinct j->>'id') from jsonb_array_elements(p_draft) as j) then
    raise exception 'IDs inválidos o duplicados' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_draft) loop
    select value into expected from jsonb_array_elements(p_base) where value->>'id'=item->>'id';
    if exists(select 1 from public.subtek_legacy_archives where collection=p_table and record_id=item->>'id' and active) then
      if item is distinct from expected then raise exception 'El registro fue archivado: %',item->>'id' using errcode='40001'; end if;
      continue;
    end if;
    execute format('select to_jsonb(t) from public.%I t where id::text=$1 for update',p_table) into actual using item->>'id';
    if item = expected then
      -- No reescribir una fila sin cambios: conservar ediciones externas y filas archivadas.
      if actual is not null then result := result || jsonb_build_array(actual); end if;
      continue;
    end if;
    if actual is distinct from expected then raise exception 'Conflicto en % id %',p_table,item->>'id' using errcode='40001'; end if;
    if exists(select 1 from jsonb_object_keys(item) as k where not exists(
      select 1 from pg_attribute a where a.attrelid=to_regclass('public.'||p_table) and a.attname=k and a.attnum>0 and not a.attisdropped and a.attgenerated=''
    )) then raise exception 'Campo desconocido en %',p_table using errcode='22023'; end if;
    select string_agg(format('%I',k),',' order by k),string_agg(format('r.%I',k),',' order by k)
      into cols,vals from jsonb_object_keys(item) as k;
    if expected is null then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',p_table,cols,vals,p_table,p_table)
        into saved using item;
    else
      select string_agg(format('%I=r.%I',k,k),',' order by k) into assignments from jsonb_object_keys(item) as k
        where k <> 'id' and (item->k) is distinct from (expected->k);
      if assignments is null then saved := actual;
      else execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where t.id::text=$2 returning to_jsonb(t.*)',p_table,assignments,p_table)
        into saved using item,item->>'id'; end if;
    end if;
    insert into public.subtek_legacy_history(collection,record_id,previous_snapshot,saved_snapshot,saved_by)
      values(p_table,item->>'id',actual,saved,auth.uid());
    result := result || jsonb_build_array(saved);
  end loop;
  -- Faltantes en p_draft no generan DELETE; el archivado es una operación distinta.
  return result;
end;
$$;
create function subtek_private.subtek_save_legacy_dashboard(p_hip_base jsonb,p_hip_draft jsonb,p_clientes_base jsonb,p_clientes_draft jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare hip jsonb; cl jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.subtek_config_members where user_id=auth.uid()) then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('subtek_legacy_dashboard'));
  hip := subtek_private._subtek_apply_legacy('hipotesis',p_hip_base,p_hip_draft);
  cl := subtek_private._subtek_apply_legacy('clientes',p_clientes_base,p_clientes_draft);
  return jsonb_build_object('hipotesis',hip,'clientes',cl);
exception when unique_violation then raise exception 'Conflicto de ID existente' using errcode='40001';
end;
$$;
revoke all on function subtek_private._subtek_apply_legacy(text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function subtek_private.subtek_save_legacy_dashboard(jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function subtek_private.subtek_save_legacy_dashboard(jsonb,jsonb,jsonb,jsonb) to authenticated;
-- Desactiva escrituras antiguas que eludirían el control de concurrencia. No cambia filas ni políticas SELECT.
revoke insert,update,delete,truncate,references,trigger on public.hipotesis,public.clientes from public,anon,authenticated;
revoke insert,update,delete on public.presupuesto_global from public,anon,authenticated;
create function public.subtek_save_legacy_dashboard(p_hip_base jsonb,p_hip_draft jsonb,p_clientes_base jsonb,p_clientes_draft jsonb) returns jsonb
language sql security invoker set search_path = '' as $$ select subtek_private.subtek_save_legacy_dashboard(p_hip_base,p_hip_draft,p_clientes_base,p_clientes_draft); $$;
revoke all on function public.subtek_save_legacy_dashboard(jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.subtek_save_legacy_dashboard(jsonb,jsonb,jsonb,jsonb) to authenticated;
commit;
