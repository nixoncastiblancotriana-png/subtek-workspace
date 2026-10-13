# Producción restaurada · 13 octubre 2026

URL: https://subtek-workspace-gold.vercel.app/
Proyecto Supabase: fzjovmnudqbwukyzsznc.

El propietario autorizó explícitamente restaurar el acceso original sin inicio de sesión. La aplicación vuelve al código original; en app/page.tsx únicamente se añaden el import y el componente Weekly al final. No hay acceso por correo, panel de transición ni otras modificaciones a las secciones originales.

La migración restore_original_access_and_weekly se aplicó (versión 20261013224820). Las tres tablas existentes vuelven al modelo de lectura, creación, edición y borrado sin sesión usado originalmente. El Weekly es compartido sin sesión: lectura con RLS y escritura mediante RPC validada con control de revisión e historial.

Las 7 hipótesis, los 7 clientes y el presupuesto de 16000000 permanecen idénticos a las copias anteriores. No se borraron ni alteraron registros durante la restauración. Comprobación adicional por REST sin JWT: datos accesibles con la clave publicable del cliente.

Propuesta #2 fusionada; Vercel publica main. Las tablas y copias adicionales de la primera intervención se conservan para evitar eliminar datos; la aplicación original ya no usa el flujo de configuración compartida ni Auth.

Pruebas: compilación, PostgreSQL aislado con restauración, navegador simulado sin sesión y comprobación de acceso REST real. El acceso público es una decisión explícita del propietario, no una certificación de privacidad del contenido publicado.
