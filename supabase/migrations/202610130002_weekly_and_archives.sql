begin;
create table public.subtek_weekly_notes (
  id uuid primary key,
  week_start date not null check (extract(isodow from week_start) = 1),
  task text not null check (length(trim(task)) between 1 and 300),
  responsible text not null check (length(trim(responsible)) between 1 and 150),
  due_date date not null,
  status text not null check (status in ('Pendiente','En curso','Completada','Bloqueada')),
  notes text not null default '' check (length(notes) <= 20000),
  archived boolean not null default false,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table public.subtek_weekly_history (
  note_id uuid not null references public.subtek_weekly_notes(id),
  revision integer not null,
  snapshot jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null,
  primary key (note_id, revision)
);
create table public.subtek_legacy_archives (
  collection text not null check (collection in ('hipotesis','clientes')),
  record_id text not null,
  active boolean not null default true,
  archived_at timestamptz not null default now(),
  archived_by uuid references auth.users(id) on delete set null,
  primary key (collection, record_id)
);
alter table public.subtek_weekly_notes enable row level security;
alter table public.subtek_weekly_history enable row level security;
alter table public.subtek_legacy_archives enable row level security;
revoke all on public.subtek_weekly_notes, public.subtek_weekly_history, public.subtek_legacy_archives from public, anon, authenticated;
grant select on public.subtek_weekly_notes, public.subtek_weekly_history, public.subtek_legacy_archives to authenticated;
create policy weekly_member_read on public.subtek_weekly_notes for select to authenticated
  using (exists (select 1 from public.subtek_config_members where user_id = (select auth.uid())));
create policy weekly_history_member_read on public.subtek_weekly_history for select to authenticated
  using (exists (select 1 from public.subtek_config_members where user_id = (select auth.uid())));
create policy archives_member_read on public.subtek_legacy_archives for select to authenticated
  using (exists (select 1 from public.subtek_config_members where user_id = (select auth.uid())));

create function public.subtek_save_weekly_note(p_id uuid, p_expected_revision integer,
  p_week_start date, p_task text, p_responsible text, p_due_date date,
  p_status text, p_notes text, p_archived boolean)
returns public.subtek_weekly_notes language plpgsql security definer set search_path = '' as $$
declare result public.subtek_weekly_notes;
begin
  if auth.uid() is null or not exists (select 1 from public.subtek_config_members where user_id = auth.uid()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
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
create function public.subtek_archive_legacy(p_collection text,p_record_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.subtek_config_members where user_id = auth.uid()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('subtek_legacy_dashboard'));
  insert into public.subtek_legacy_archives(collection,record_id,archived_by)
    values(p_collection,p_record_id,auth.uid()) on conflict (collection,record_id) do update set active=true, archived_at=now(), archived_by=auth.uid();
end;
$$;
revoke all on function public.subtek_save_weekly_note(uuid,integer,date,text,text,date,text,text,boolean) from public,anon,authenticated;
revoke all on function public.subtek_archive_legacy(text,text) from public,anon,authenticated;
grant execute on function public.subtek_save_weekly_note(uuid,integer,date,text,text,date,text,text,boolean) to authenticated;
grant execute on function public.subtek_archive_legacy(text,text) to authenticated;
commit;
