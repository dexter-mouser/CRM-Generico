# Backend (Spring Boot 3 + PostgreSQL)

Java 21, Maven, JdbcClient, Flyway, JWT en cookie HttpOnly. Todo está separado por tienda (`tienda_id`).

## Módulos disponibles
Autenticación (`/api/auth/ingreso|salida|yo`), roles, usuarios, productos (con importación validada), clientes, facturas de venta (con monto recibido y devuelta) con notas de devolución (ND) y de anulación (NA), auditoría.

## Pendientes
Remisiones y cotizaciones (las tablas ya están en la migración V3), caja, abonos/pagos, facturas, contabilidad (cierre y reapertura), reportes, ajustes, copia de seguridad, ingreso con Google.

## Ejecutar en desarrollo
1. PostgreSQL con base `generico` (o `docker compose up base` en `deploy/`).
2. Variables: `SPRING_PROFILES_ACTIVE=dev`, `BASE_URL`, `BASE_USUARIO`, `BASE_CLAVE`.
3. `mvn spring-boot:run`. El perfil `dev` crea la tienda de demostración (clave en `CLAVE_DEMO`, por defecto `admin123`).

## Producción
Define `JWT_SECRETO` (≥ 32 caracteres), `ORIGENES_PERMITIDOS`, y no uses el perfil `dev`. Ver `deploy/`.

## Seguridad
Contraseñas BCrypt, bloqueo tras 5 intentos, permisos leídos de la base en cada petición, cabecera `X-Generico: 1` obligatoria en escrituras, auditoría que no se puede modificar ni borrar.
