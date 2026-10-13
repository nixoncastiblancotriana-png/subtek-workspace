# Validación realizada

- `npx tsc --noEmit`: correcto.
- `npm run build`: compilación Next.js de producción correcta.
- PostgreSQL aislado con PGlite: las tres migraciones pasan; se verificaron creación exclusiva, control de revisión, validación de campos, RLS, permisos RPC, historial, guardado atómico de proyectos/clientes, rechazo de datos antiguos, archivo sin borrar y conservación de las tablas originales.
- Navegador Chromium con solicitudes Supabase interceptadas: escritorio y móvil, conciliación explícita, claves v6 preservadas, cero escrituras iniciales, creación del weekly y conflictos de configuración/notas conservando el borrador. Cero errores de navegador y sin desbordamiento horizontal a 390 px.
- Se inspeccionó visualmente el diseño oscuro/cian del weekly.

No se ejecutó ninguna migración ni escritura en Supabase real. Auth, SMTP, RLS y esquema del proyecto desplegado requieren la validación de staging indicada en README.md.
