# Seguridad

Qué ya hace la interfaz y qué debe hacer el backend. La interfaz solo oculta y avisa: **toda regla debe repetirse en el servidor**.

## Ya implementado en el navegador

| Medida | Dónde |
|---|---|
| Política de contenido (CSP) en cada página: solo scripts, estilos e imágenes propios; sin `object`, `base` ni formularios externos | `<meta http-equiv="Content-Security-Policy">` de cada `.html` |
| Textos siempre escapados al dibujar (`{{x}}`); el HTML sin escapar (`{{{x}}}`) solo se usa con plantillas propias | `src/core/template.js` |
| Permisos por rol aplicados en el menú, en cada pantalla y dentro de cada servicio (`exigirPermiso`) | `src/core/autorizacion.js`, `src/services/*` |
| Permiso especial «Reabrir» para reabrir la contabilidad | `src/config/permisos.js` |
| Bloqueo de 5 minutos tras 5 intentos fallidos de ingreso | `src/modules/acceso/acceso.js` |
| Cierre de sesión por 30 minutos de inactividad y si la persona es desactivada | `src/core/sesion.js`, `src/main.js` |
| Auditoría de acciones (quién, cuándo, qué); solo se agregan registros | `src/services/auditoria.service.js` |
| Día cerrado inmutable: no se anulan sus ventas ni se registran facturas con esa fecha | `ventas.service.js`, `inventario.service.js` |
| Validación única de datos, incluida la copia de seguridad | `src/core/validacion.js` |

## Obligatorio en el backend (Spring Boot)

1. **Sesión**: JWT de corta duración en cookie `HttpOnly; Secure; SameSite=Strict` con renovación. Nunca en `localStorage`. Protección CSRF si se usan cookies.
2. **Contraseñas**: BCrypt o Argon2 con sal. Sin contraseñas ni correos de prueba en el código final; el acceso por Google valida el token en el servidor.
3. **Autorización**: cada endpoint revisa el rol y la acción (`@PreAuthorize`) con la misma tabla de `src/config/permisos.js`. La interfaz no es una barrera.
4. **Límite de intentos** por usuario e IP, con bloqueo progresivo y alertas.
5. **Cabeceras**: `Content-Security-Policy` (con `frame-ancestors 'none'`, que no funciona en `<meta>`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`.
6. **CORS** limitado al dominio de la aplicación; sin comodines.
7. **Auditoría append-only**: tabla sin `UPDATE` ni `DELETE` para el usuario de la aplicación; el usuario sale del token, nunca del cuerpo de la petición.
8. **Cierres contables inmutables**: restricción en base de datos (trigger o regla) que impida modificar movimientos con fecha ≤ último día cerrado; reabrir exige el permiso `contabilidad:reabrir`, motivo y registro de auditoría.
9. **Validación** de cada petición con las reglas de `docs/validacion.md`, con límites de tamaño de cuerpo y de archivos.
10. **Copias de seguridad**: cifradas, con prueba periódica de restauración. La huella SHA-256 de la copia del navegador solo detecta daños; en el servidor se debe firmar (HMAC).
11. **Datos personales**: registrar solo lo necesario, política de retención y borrado.
