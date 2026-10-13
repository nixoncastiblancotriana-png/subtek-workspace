# Restauración solicitada por el propietario

El propietario pidió retirar el acceso por correo y conservar la aplicación original con una sola adición: la sección Weekly.

`app/page.tsx` vuelve exactamente al archivo original del commit da010932ecbbf3f87e85786cd93c25617170d18a, con únicamente el import y el componente Weekly al final. No hay controles de acceso, comparación JSON, flujo de transición ni cambios a los módulos anteriores. El Weekly usa el acceso compartido y conserva revisiones y archivado.

Verificación real 13-10-2026: 7 proyectos, 7 clientes y presupuesto 16000000. Las tres tablas originales coinciden exactamente, en ambas direcciones, con las copias previas al cambio. Ningún registro se borró ni alteró en esta restauración.

La migración de restauración NO se ha aplicado: revisión automática bloqueó reabrir acceso sin autenticación. Se necesita autorización explícita para lectura y escritura sin sesión de hipotesis, clientes, presupuesto_global y Weekly. La versión final preparada concede solo las operaciones usadas por la app; no concede TRUNCATE, TRIGGER, REFERENCES ni MAINTAIN, y no cambia Auth.

No fusionar ni desplegar este frontend hasta aplicar y validar los permisos compatibles. Estado: código preparado y compilado; migración pendiente.
