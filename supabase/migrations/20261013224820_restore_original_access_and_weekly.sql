-- Restituye exactamente el modelo de acceso anterior y permite usar Weekly sin sesión.
-- No contiene DELETE, TRUNCATE ni DROP TABLE; no modifica registros existentes.
begin;
alter table public.hipotesis disable row level security;
alter table public.clientes disable row level security;
alter table public.presupuesto_global disable row level security;
grant select,insert,update,delete on table public.hipotesis,public.clientes,public.presupuesto_global to anon,authenticated;
-- El nuevo Weekly conserva RLS: lectura pública y escritura únicamente mediante RPC validada.
grant select on public.subtek_weekly_notes,public.subtek_weekly_history to anon,authenticated;
create policy weekly_shared_read on public.subtek_weekly_notes for select to anon,authenticated using(true);
create policy weekly_shared_history_read on public.subtek_weekly_history for select to anon,authenticated using(true);
grant usage on schema subtek_private to anon;
create or replace function subtek_private.subtek_save_weekly_note(p_id uuid, p_expected_revision integer,
  p_week_start date, p_task text, p_responsible text, p_due_date date,
  p_status text, p_notes text, p_archived boolean)
returns public.subtek_weekly_notes language plpgsql security definer set search_path = '' as $$
declare result public.subtek_weekly_notes;
begin
  -- Acceso compartido sin sesión solicitado por el propietario; se conservan validación, CAS e historial.
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'Revisión inválida' using errcode = '22023'; end if;
  if p_expected_revision = 0 then
    insert into public.subtek_weekly_notes(id,week_start,task,responsible,due_date,status,notes,archived,revision,updated_by)
      values(p_id,p_week_start,p_task,p_responsible,p_due_date,p_status,p_notes,p_archived,1,auth.uid())
      on conflict(id) do nothing returning * into result;
  else
    update public.subtek_weekly_notes set week_start=p_week_start,task=p_task,responsible=p_responsible,
      due_date=p_due_date,status=p_status,notes=p_notes,archived=p_archived,revision=revision+1,
      updated_at=now(),updated_by=auth.uid()
      where id=p_id and revision=p_expected_revision returning * into result;
  end if;
  if result.id is null then raise exception 'Conflicto: la nota cambió en otro dispositivo' using errcode = '40001'; end if;
  insert into public.subtek_weekly_history(note_id,revision,snapshot,saved_by)
    values(result.id,result.revision,to_jsonb(result),auth.uid());
  return result;
end;
$$;
grant execute on function subtek_private.subtek_save_weekly_note(uuid,integer,date,text,text,date,text,text,boolean) to anon,authenticated;
grant execute on function public.subtek_save_weekly_note(uuid,integer,date,text,text,date,text,text,boolean) to anon,authenticated;
commit;
