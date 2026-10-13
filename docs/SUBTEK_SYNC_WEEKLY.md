# SUBTEK · sincronización y Weekly

Implementación propuesta sobre `nixoncastiblancotriana-png/subtek-workspace`, commit
`da010932ecbbf3f87e85786cd93c25617170d18a` (main inspeccionado el 13-10-2026).
El adjunto «Texto pegado.txt» coincide con ese archivo salvo una línea en blanco final.
Los cambios se entregan mediante una rama y pull request. No se han aplicado migraciones ni modificaciones en Supabase real.

## Confirmado en el código

| Dato | Recuperación original | Guardado original | Problema |
|---|---|---|---|
| Proyectos / hipótesis | `subtek-data-v6`, después `hipotesis.select('*')` | local automático, nube manual con `upsert` de todo el arreglo | nube reemplaza copia local si no está vacía; escrituras desactualizadas; lecturas sin comprobar `error` |
| Clientes | `subtek-clientes-v6`, después `clientes.select('*')` | igual que proyectos | mismos riesgos; cotización guarda solo nombre del archivo, no sube PDF |
| Total presupuesto | `subtek-ppto-v6`, después `presupuesto_global.total`, id 1 | local y `upsert({id:1,total})` | total de nube puede mezclarse con periodo local |
| Mes / año | `subtek-ppto-mes-v6` / `subtek-ppto-anio-v6` | solo local | divergen por navegador |
| Roadmap | `subtek-roadmap-v6`, diez booleanos | solo local | botón de guardar podía indicar éxito sin subir fases |
| Borrados | eliminación local seguida de `delete` remoto | no comprobaba error devuelto | pérdida de coherencia, fila podía reaparecer |
| «Congelar Ppto» | cambia bandera y muestra alerta | no crea snapshot mensual | el texto ofrecía una función no implementada |

En el árbol revisado no hay migraciones, esquema Supabase, backend ni flujo Auth.
El archivo contiene URL y clave **publicable** del cliente; no se usa una clave de servicio.
No se puede deducir de esto que las tablas tengan RLS, que las políticas sean seguras,
que el esquema coincida o que el despliegue ejecute exactamente este commit.

## Cambios entregados

- `app/page.tsx`: integración completa conservando vistas y estética; revisión de diferencias,
  respaldo, acceso por enlace de correo, mensajes de error reales y sección Weekly al final.
- `lib/dashboard-config.ts`: validación de las diez claves, importación v6 y respaldo original.
- `lib/use-dashboard-config.ts`: configuración compartida, caché separada por cuenta y pestaña,
  borrador persistente, comprobación al enfocar y cada 30 segundos, revisión explícita y CAS.
- `components/weekly-notes.tsx`: tarjetas oscuras con acentos cian, semana, responsable,
  fecha compromiso, tarea, seguimiento, estados, filtros, búsqueda, exportación, archivado
  y versiones. Cada nota se guarda de forma explícita e independiente.
- Tres migraciones aditivas; consultas de preflight; pruebas de BD y de interfaz aislada.

`subtek_dashboard_config` almacena **total + mes + año + roadmap** en una fila compartida id 1.
Se usa una configuración de todo Subtek, coherente con el singleton del código original.
Si la plataforma tiene varias empresas/workspaces, detener aquí y agregar `workspace_id`
y membresías por workspace antes de aplicar. No usar este singleton para múltiples empresas.
El histórico financiero conserva revisiones de configuración; NO es un libro contable
ni una tabla de presupuestos mensuales. Para estos se necesita un modelo por periodo aparte.

No se siembra fila con defaults. El primer guardado debe ser una decisión revisada;
`expected_revision=0` solo crea si la fila sigue ausente. Las siguientes escrituras
actualizan únicamente si la revisión coincide. La actualización y el historial son
una sola transacción. Dos revisiones diferentes requieren conciliación; nunca se aplica
«el último que guarda gana» ni un OR automático de fases (también se debe conservar `false`).

La carga no sustituye un borrador pendiente. Ante error de nube se conserva; para configuración
se bloquean nuevas ediciones hasta verificar acceso, evitando inicializar por fallo de red.
Las notas permiten conservar borradores y volver a intentar. Los borradores de pestañas
cerradas quedan en localStorage y se incluyen en «Exportar respaldo»; no se reimportan
silenciosamente desde otra pestaña/cuenta.

Las acciones anteriores de eliminar proyectos/clientes ahora crean metadatos de archivo;
las filas originales permanecen. El Weekly usa `archived=true` y conserva todas sus versiones.
La tercera migración guarda proyectos y clientes en una transacción, compara cada fila
modificada con su copia base, conserva columnas adicionales de la BD y registra antes/después.
No reescribe filas sin cambios. Una fila ausente del arreglo no se borra. Una fila archivada
no se vuelve a publicar. La configuración y proyectos/clientes son dos transacciones:
si la segunda falla, la primera puede estar confirmada y el mensaje indica guardado parcial.

## Requisitos a verificar en la base real

1. Ejecutar `docs/preflight.sql` como operador con acceso completo. Confirmar tablas `public`,
   PK simple `id` en proyectos/clientes, tipos, columnas, límites de API, defaults,
   columnas generadas/identity, triggers y permisos. Probar columnas JSONB, fechas y números
   con datos de staging. No adivinar que las interfaces TypeScript son el esquema de BD.
2. Confirmar si `presupuesto_global.id=1` existe y obtener su total para la conciliación.
   El código nuevo lo consulta solo como referencia; deja de escribirlo y no borra esa fila.
3. Revisar RLS actual de las tres tablas, permisos de columna e herencias de roles.
   La migración 003 revoca DML directo de anon/authenticated para que versiones antiguas
   no eludan el control de concurrencia. Si hay permisos por columna o roles heredados,
   resolverlos explícitamente después de revisar el preflight; la revocación de tabla
   no garantiza retirar todos los permisos de columna. Comprobar DML denegado en staging.
4. Confirmar Supabase Auth por correo y SMTP, usuarios existentes y URL de redirección
   autorizada del sitio (y localhost para staging). El acceso usa `shouldCreateUser:false`:
   crear/invitar usuarios desde administración y añadir sus UUID a la membresía.
5. Confirmar que no existen objetos nuevos con los mismos nombres. Las migraciones fallan
   si existen; no usar `IF NOT EXISTS` para esconder un esquema incompatible.

La membresía **NO se autoconcede**. Después de verificar el UUID real del usuario:

```sql
-- Sustituir por el UUID de auth.users del miembro ya verificado.
insert into public.subtek_config_members(user_id)
values ('UUID-REAL-DEL-USUARIO'::uuid) on conflict do nothing;
```

Las tablas nuevas tienen RLS; solo miembros autenticados pueden leerlas. El cliente no
puede escribir directamente. Las RPC comprueban membresía, tienen `search_path=''`,
nombres calificados y permisos EXECUTE limitados. Nunca poner `service_role` en el navegador.
Esto no certifica las políticas SELECT existentes de proyectos/clientes: revisarlas aparte.

## Transición sin sobrescribir datos

1. **Congelar ediciones** en todas las instancias antiguas. Avisar al equipo y cerrar pestañas
   antiguas. Guardar backup completo restaurable de BD (Supabase/pg_dump) y resultados
   del preflight. Ninguna migración sustituye un backup.
2. **Antes de cargar la versión nueva**, en cada computador y cada perfil/origen del navegador,
   exportar las seis claves v6. localStorage no se puede recuperar desde otro computador.
   Guardar un archivo por dispositivo con fecha y propietario. Un origen diferente
   (`http/https`, dominio o puerto) tiene almacenamiento diferente.
   Ejemplo para consola de navegador, que solo lee y descarga:

```js
const keys=['subtek-data-v6','subtek-clientes-v6','subtek-ppto-v6','subtek-ppto-mes-v6','subtek-ppto-anio-v6','subtek-roadmap-v6'];
const backup={at:new Date().toISOString(),origin:location.origin,raw:Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))};
const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
const a=document.createElement('a');a.href=url;a.download='subtek-v6-respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
```

3. Reunir respaldos y conciliar con el total actual en Supabase. Sin marcas de versión previas
   no hay forma segura de decidir cuál copia local es la más reciente. Elegir y documentar
   los diez estados (true y false), el total y el periodo. No iniciar con defaults de un PC nuevo.
4. En **staging**, aplicar migraciones 001, 002 y 003 en ese orden. Ejecutar pruebas de acceso,
   tipos y concurrencia. Las tablas existentes no cambian de estructura ni de contenido.
   003 cambia permisos de escritura de los clientes: revisar consumidores antes de aplicarla.
5. Preparar los archivos nuevos en una rama; conservar `public/logo.jpg` y `public/subi.jpg`.
   Ejecutar `npm ci` (o `npm install` si no se adopta el lock), `npx tsc --noEmit`, `npm run build`.
6. Durante la ventana controlada de producción, aplicar las migraciones y conceder membresías.
   Comparar huellas y cantidades anteriores: deben permanecer iguales al terminar DDL,
   antes de cualquier edición. Publicar la aplicación. No habilitar usuarios si no coincide.
7. En el equipo de referencia, iniciar sesión, comprobar nube y revisar el panel borrador/nube.
   Ajustar roadmap y presupuesto en sus vistas. Marcar revisión y pulsar **aprobar borrador
   conciliado**, luego **Guardar roadmap y presupuesto**. Verificar fila id 1 y revisión 1.
   La copia de seguridad original v6 no se cambia ni se elimina; antes de adoptar se conserva también una copia durable del borrador, además de la descarga.
8. En otros equipos, exportar primero las diferencias. Seleccionar **adoptar nube** después
   de revisar. Nunca publicar automáticamente sus copias antiguas. Para proyectos/clientes
   con diferencias, el guardado se bloquea: exportar, revisar y adoptar la copia de nube.
   Recuperar cambios locales válidos desde el respaldo mediante edición revisada; no subir
   el arreglo antiguo completo para «restaurar todo».
9. Habilitar ediciones solo después de completar la matriz siguiente. Retener los respaldos,
   el presupuesto antiguo y los historiales; no ejecutar DELETE/TRUNCATE/DROP para limpiar.

## Validación de aceptación

| Prueba | Resultado obligatorio |
|---|---|
| DDL con datos existentes y comparación pre/post | mismas filas y huellas en las tres tablas anteriores |
| PC nuevo, sin v6 ni configuración compartida | cero INSERT/UPDATE automático; revisión inicial requerida |
| v6 distinto de nube | borrador y respaldo preservados; botón de guardar bloqueado |
| A guarda roadmap + total + periodo; B vuelve al sitio | B recibe esos cuatro datos juntos al comprobar la nube |
| A/B editan revisión N y A guarda primero | B recibe `40001`, conserva borrador, no sobrescribe A |
| Dos inicializaciones de fila ausente | una gana; otra falla; no reemplaza la inicialización |
| Error RLS/red/esquema | estado sin confirmar; no alerta de éxito; borradores exportables |
| Tablas de proyectos/clientes vacías | se aceptan como resultado válido; no resucitan datos locales |
| >1.000 proyectos/clientes | lectura paginada completa; no adopta una página como colección entera |
| Edición concurrente de proyecto/cliente | RPC rechaza solo el intento conflictivo y revierte el lote completo |
| Columna adicional no editada | se conserva; historial almacena la fila anterior y posterior |
| Usuario anónimo o autenticado no miembro | no lee tablas nuevas ni ejecuta escrituras RPC |
| Miembro intenta DML directo | INSERT/UPDATE/DELETE denegados, incluidas posibles grants de columna |
| Crear weekly, filtrar semana/responsable, editar y completar | se ve en otro equipo; aumenta revisión y conserva historial |
| Dos miembros editan la misma nota | conflicto visible con borrador y versión servidor; revisión manual |
| Archivar weekly/proyecto/cliente | ninguna fila se borra; weekly visible en filtro archivados |
| Dos pestañas, guardar mientras edita, cambiar sesión | no se acepta una respuesta de otra cuenta; no se publican defaults |
| Móvil 390px y escritorio | controles legibles, filtros accesibles, sin scroll horizontal |

Para recuperar un proyecto/cliente archivado sin borrar el registro de archivo, un operador
puede ejecutar `UPDATE subtek_legacy_archives SET active=false` con colección/id verificados.
Volver a comprobar la nube y adoptar tras exportar. Para weekly, activar «Ver archivados»,
abrir nota, desmarcar «Archivar» y guardar. Para restaurar una versión de roadmap o nota,
leer historial y guardarla como **nueva revisión**, sin reducir revision ni editar el historial.

Rollback: congelar ediciones y conservar tablas/historiales nuevos. Exportar estado actualizado.
No desplegar la versión antigua con permisos de escritura restaurados automáticamente:
podría publicar copias locales obsoletas. Aplicar una corrección de la versión nueva o habilitar
la antigua solo en lectura hasta conciliar. No ejecutar down migrations destructivas.

## Pruebas incluidas y límites

`npm install --prefix tests` y `npm test --prefix tests` ejecutan PostgreSQL embebido (PGlite)
con Auth simulado: migraciones, validación, CAS, historial, roles, atomicidad y conservación.
`tests/ui.cjs` intercepta todas las solicitudes al dominio Supabase: nunca escribe en BD real.
Para ejecutarlo: instalar Playwright en tests, `npx playwright install chromium`, iniciar la app
local en puerto 3100 y ejecutar `node tests/ui.cjs`. El test prepara usuarios/datos ficticios.

El archivo original conserva `@ts-nocheck`; los módulos nuevos se comprueban con TypeScript.
Next.js y demás dependencias base se mantienen para limitar el cambio. La actualización de
Next.js 14.2.3 a una versión mantenida requiere una tarea aparte antes de un despliegue público.
No se ha validado SMTP, RLS real, esquema real, triggers reales, Realtime, ni despliegue.
La sincronización es por comprobación al enfocar y cada 30 segundos, con guardado explícito;
no se configura Supabase Realtime ni se publican borradores al perder conectividad.

## Fuentes técnicas

- Código base: https://github.com/nixoncastiblancotriana-png/subtek-workspace/blob/da010932ecbbf3f87e85786cd93c25617170d18a/app/page.tsx
- Funciones y permisos: https://supabase.com/docs/guides/database/functions
- Auth y RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Lectura de fila opcional: https://supabase.com/docs/reference/javascript/using-modifiers-maybesingle
