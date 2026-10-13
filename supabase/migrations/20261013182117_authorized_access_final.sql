begin;
create table subtek_private.allowed_emails (email text primary key check(email=lower(email)));
alter table subtek_private.allowed_emails enable row level security;
revoke all on subtek_private.allowed_emails from public,anon,authenticated;
insert into subtek_private.allowed_emails(email) values ('nixoncastiblancotriana@gmail.com');
create function subtek_private.grant_verified_member() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and exists(select 1 from subtek_private.allowed_emails where email=lower(new.email)) then
  insert into public.subtek_config_members(user_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end; $$;
revoke all on function subtek_private.grant_verified_member() from public,anon,authenticated;
create trigger subtek_verified_membership after insert or update of email_confirmed_at,email on auth.users
 for each row execute function subtek_private.grant_verified_member();
insert into public.subtek_config_members(user_id) select u.id from auth.users u join subtek_private.allowed_emails a on a.email=lower(u.email) where u.email_confirmed_at is not null on conflict do nothing;
-- RLS también para las tablas existentes: solo miembros pueden leerlas.
alter table public.hipotesis enable row level security;
alter table public.clientes enable row level security;
alter table public.presupuesto_global enable row level security;
create policy subtek_members_read on public.hipotesis for select to authenticated
 using(exists(select 1 from public.subtek_config_members where user_id=(select auth.uid())));
create policy subtek_members_read on public.clientes for select to authenticated
 using(exists(select 1 from public.subtek_config_members where user_id=(select auth.uid())));
create policy subtek_members_read on public.presupuesto_global for select to authenticated
 using(exists(select 1 from public.subtek_config_members where user_id=(select auth.uid())));
-- RLS ahora habilitado: conceder lectura autenticada explícita, no lectura anónima.
revoke select on public.hipotesis,public.clientes,public.presupuesto_global from public,anon;
grant select on public.hipotesis,public.clientes,public.presupuesto_global to authenticated;
-- Restringir el event trigger existente sin cambiar su ejecución por el dueño de BD.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke all on function public.rls_auto_enable() from public,anon,authenticated';
 end if;
end; $$;
create index subtek_weekly_week_id_idx on public.subtek_weekly_notes(week_start,id);
create index subtek_config_updated_by_idx on public.subtek_dashboard_config(updated_by);
create index subtek_config_history_saved_by_idx on public.subtek_dashboard_config_history(saved_by);
create index subtek_weekly_updated_by_idx on public.subtek_weekly_notes(updated_by);
create index subtek_weekly_history_saved_by_idx on public.subtek_weekly_history(saved_by);
create index subtek_archives_archived_by_idx on public.subtek_legacy_archives(archived_by);
create index subtek_legacy_history_saved_by_idx on public.subtek_legacy_history(saved_by);
commit;
