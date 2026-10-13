-- Aditiva. No toca hipotesis, clientes ni presupuesto_global. No siembra defaults.
-- Aplicar una sola vez, después del preflight y del backup, usando el dueño de BD.
begin;
create schema subtek_private;
revoke all on schema subtek_private from public,anon,authenticated;
grant usage on schema subtek_private to authenticated;
lock table public.hipotesis,public.clientes,public.presupuesto_global in share mode;
create table subtek_private.hipotesis_before_20261013 as table public.hipotesis;
create table subtek_private.clientes_before_20261013 as table public.clientes;
create table subtek_private.presupuesto_before_20261013 as table public.presupuesto_global;
alter table subtek_private.hipotesis_before_20261013 enable row level security;
alter table subtek_private.clientes_before_20261013 enable row level security;
alter table subtek_private.presupuesto_before_20261013 enable row level security;
revoke all on all tables in schema subtek_private from public,anon,authenticated;

create table public.subtek_config_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.subtek_dashboard_config (
  id smallint primary key check (id = 1),
  roadmap jsonb not null,
  total numeric not null check (total >= 0 and total <> 'NaN'::numeric and total <> 'Infinity'::numeric),
  mes text not null check (mes in ('Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre')),
  anio integer not null check (anio between 2000 and 2100),
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table public.subtek_dashboard_config_history (
  revision integer primary key,
  snapshot jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null
);
alter table public.subtek_config_members enable row level security;
alter table public.subtek_dashboard_config enable row level security;
alter table public.subtek_dashboard_config_history enable row level security;
revoke all on public.subtek_config_members, public.subtek_dashboard_config,
  public.subtek_dashboard_config_history from public, anon, authenticated;
grant select on public.subtek_config_members, public.subtek_dashboard_config,
  public.subtek_dashboard_config_history to authenticated;
create policy own_membership on public.subtek_config_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy config_member_read on public.subtek_dashboard_config for select to authenticated
  using (exists (select 1 from public.subtek_config_members where user_id = (select auth.uid())));
create policy history_member_read on public.subtek_dashboard_config_history for select to authenticated
  using (exists (select 1 from public.subtek_config_members where user_id = (select auth.uid())));

create function subtek_private.subtek_save_dashboard_config(
  p_expected_revision integer, p_roadmap jsonb, p_total numeric, p_mes text, p_anio integer
) returns public.subtek_dashboard_config
language plpgsql security definer set search_path = '' as $$
declare
  result public.subtek_dashboard_config;
  keys text[] := array['fase1_cctv','fase1_vactor','fase1_inspeccion','fase2_saas',
    'fase2_etiquetador','fase2_recomendaciones','fase2_vision','fase3_predictivo','fase3_vision_rt','fase3_macp'];
begin
  if auth.uid() is null or not exists (
    select 1 from public.subtek_config_members where user_id = auth.uid()
  ) then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Revisión inválida' using errcode = '22023';
  end if;
  if p_roadmap is null or jsonb_typeof(p_roadmap) <> 'object' then
    raise exception 'Roadmap inválido' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_roadmap)) <> 10 or
    exists (select 1 from unnest(keys) as k where jsonb_typeof(p_roadmap -> k) is distinct from 'boolean') then
    raise exception 'Roadmap: se requieren exactamente las diez claves booleanas' using errcode = '22023';
  end if;
  -- INSERT ... DO NOTHING evita que dos inicializaciones se sobrescriban.
  if p_expected_revision = 0 then
    insert into public.subtek_dashboard_config(id, roadmap, total, mes, anio, revision, updated_by)
      values (1, p_roadmap, p_total, p_mes, p_anio, 1, auth.uid())
      on conflict (id) do nothing returning * into result;
  else
    -- UPDATE condicional toma el bloqueo de fila y vuelve a comprobar la revisión.
    update public.subtek_dashboard_config set roadmap = p_roadmap, total = p_total,
      mes = p_mes, anio = p_anio, revision = revision + 1, updated_at = now(), updated_by = auth.uid()
      where id = 1 and revision = p_expected_revision returning * into result;
  end if;
  if result.id is null then raise exception 'Conflicto: recargar y conciliar sin sobrescribir' using errcode = '40001'; end if;
  insert into public.subtek_dashboard_config_history(revision, snapshot, saved_by)
    values (result.revision, to_jsonb(result), auth.uid());
  return result;
end;
$$;
revoke all on function subtek_private.subtek_save_dashboard_config(integer,jsonb,numeric,text,integer) from public, anon, authenticated;
grant execute on function subtek_private.subtek_save_dashboard_config(integer,jsonb,numeric,text,integer) to authenticated;
create function public.subtek_save_dashboard_config(p_expected_revision integer, p_roadmap jsonb, p_total numeric, p_mes text, p_anio integer) returns public.subtek_dashboard_config
language sql security invoker set search_path = '' as $$ select subtek_private.subtek_save_dashboard_config(p_expected_revision,p_roadmap,p_total,p_mes,p_anio); $$;
revoke all on function public.subtek_save_dashboard_config(integer,jsonb,numeric,text,integer) from public,anon,authenticated;
grant execute on function public.subtek_save_dashboard_config(integer,jsonb,numeric,text,integer) to authenticated;
commit;
