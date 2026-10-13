# Estado del despliegue · 13 octubre 2026

Proyecto real verificado: fzjovmnudqbwukyzsznc (subtek-workspace).

## Aplicado y verificado

- Copia privada de las tres tablas originales; 7 proyectos, 7 clientes, 1 presupuesto.
- Configuración, historial de configuración, notas weekly, historial de notas y metadatos de archivo creados con RLS y permisos restringidos.
- Primeras dos migraciones aplicadas y registradas.
- Comparación completa por filas y huellas: las tres tablas originales conservan exactamente su contenido.
- Copias privadas sin acceso SELECT para authenticated y RPC nuevas sin EXECUTE para anon.

## Bloqueado antes de producción

La revisión automática rechazó las dos migraciones restantes: cambian de manera persistente los permisos de las tablas existentes, activan RLS, añaden un trigger de Auth y el guardado protegido. Requiere autorización explícita del propietario para ese alcance e impacto: navegadores antiguos dejarán de guardar directamente y el dashboard requerirá iniciar sesión con una cuenta autorizada.

El usuario eligió nixoncastiblancotriana@gmail.com para el acceso inicial. El acceso final exige verificación de correo. No se crean membresías para otros correos. La migración de autorización y sus índices están preparados, pero NO se han aplicado.

No fusionar la propuesta ni publicar el frontend nuevo en el dominio de producción hasta resolver el bloqueo y validar el acceso. La versión actual en producción permanece vigente.

Pruebas locales: TypeScript, build, PostgreSQL aislado con las cuatro migraciones e interfaz desktop/móvil con Supabase simulado. No se han ejecutado escrituras de prueba sobre los datos productivos.

RLS desactivado en las tablas originales y permisos de la función rls_auto_enable son hallazgos confirmados anteriores al cambio. Pendientes por el mismo bloqueo de autorización.
