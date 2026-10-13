-- SOLO LECTURA. Ejecutar en SQL Editor antes de las migraciones. Conservar resultados.
select current_database(), version();
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public'
  and table_name in ('hipotesis','clientes','presupuesto_global') order by table_name,ordinal_position;
select c.conrelid::regclass as tabla,c.conname,c.contype,pg_get_constraintdef(c.oid) as definicion
from pg_constraint c where c.conrelid in (to_regclass('public.hipotesis'),to_regclass('public.clientes'),to_regclass('public.presupuesto_global'));
select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' order by tablename,policyname;
select relname,relrowsecurity,relforcerowsecurity,relacl from pg_class
where oid in (to_regclass('public.hipotesis'),to_regclass('public.clientes'),to_regclass('public.presupuesto_global'));
select attrelid::regclass as tabla,attname,attacl from pg_attribute
where attrelid in (to_regclass('public.hipotesis'),to_regclass('public.clientes'),to_regclass('public.presupuesto_global')) and attacl is not null;
select event_object_table,trigger_name,action_timing,event_manipulation,action_statement
from information_schema.triggers where event_object_schema='public';
-- Detectar colisiones: deben devolver NULL antes de aplicar las migraciones nuevas.
select to_regclass('public.subtek_dashboard_config'),to_regclass('public.subtek_config_members'),
       to_regclass('public.subtek_weekly_notes'),to_regclass('public.subtek_legacy_archives'),to_regclass('public.subtek_legacy_history');
-- Huellas del contenido: ejecutar ANTES y DESPUÉS con ediciones detenidas.
-- Requieren PK id confirmada y permisos de lectura completos del operador.
select 'hipotesis' as tabla,count(*) as filas,md5(coalesce(jsonb_agg(to_jsonb(t) order by id::text)::text,'[]')) as huella from public.hipotesis t
union all select 'clientes',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id::text)::text,'[]')) from public.clientes t
union all select 'presupuesto_global',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id::text)::text,'[]')) from public.presupuesto_global t;
