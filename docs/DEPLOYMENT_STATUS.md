# Producción · 13 octubre 2026

URL: https://subtek-workspace-gold.vercel.app/
Proyecto Supabase: fzjovmnudqbwukyzsznc (subtek-workspace).

- Las cuatro migraciones se aplicaron y registraron. Los nombres y timestamps de este repositorio coinciden con el historial remoto.
- La propuesta #1 se fusionó en main, commit 4b9ddc8557f32540f3566aee53775a19017e667d; Vercel confirmó el despliegue de producción.
- Copias privadas de las tres tablas originales, sin acceso público. Las tablas mantienen exactamente su contenido: 7 proyectos, 7 clientes y 1 presupuesto. Las huellas completas antes/después coinciden.
- RLS habilitado en todas las tablas públicas del dashboard; escritura directa del navegador bloqueada. Cambios mediante RPC con autorización y concurrencia.
- Correo inicial autorizado por el usuario: nixoncastiblancotriana@gmail.com. Supabase Auth exige verificar el correo; la membresía se crea después de verificarlo. No se enviaron correos de prueba ni se verificó la bandeja del propietario.
- El roadmap y el periodo no se inventan en BD: el usuario debe revisar y aprobar la importación local inicial. El total existente se conserva y se muestra como referencia.
- Weekly nuevo, inicialmente vacío; crear y editar compromisos después de iniciar sesión.

Comprobaciones: TypeScript/build, PostgreSQL aislado, Chromium desktop/móvil, tablas y permisos reales, integridad pre/post y estado Vercel. El asesor de seguridad no reporta errores ni advertencias; solo información esperada sobre RLS sin políticas en copias privadas y allowlist, que están deliberadamente cerradas.

El bloqueo inicial de revisión automática se resolvió con la autorización posterior del propietario para publicar y completar los cambios de acceso descritos.
