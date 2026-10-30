# backend/ — API (etapa 2)

Aquí va el servidor: Java 21 + Spring Boot 3.

## Qué agregar
- `src/main/java/.../auth`: inicio de sesión con Google (OAuth2/OIDC), emisión de sesión en cookie HttpOnly y lista de correos autorizados por tienda.
- `.../tienda`: tiendas, membresías y configuración por tienda.
- `.../rol`: roles y permisos creables y eliminables por el dueño.
- `.../cliente`, `.../producto`, `.../venta`, `.../pago`, `.../caja`: un paquete por proceso (controlador, servicio, repositorio, DTO).
- `.../inventario`: crear, editar y stock negativo; importar y exportar documentos CSV (y, más adelante, integración con Google Sheets/Docs mediante la API de Google).
- `.../campos`: definiciones y valores de campos personalizados (JSONB).
- `.../auditoria`: registro de quién cambió qué y cuándo.
- `.../config`: seguridad, CORS, límite de peticiones y filtro que aplica `tienda_id` en cada consulta.
- `src/test`: pruebas con JUnit 5 y Testcontainers.
- `pom.xml` o `build.gradle`, `application.yml` por entorno.
