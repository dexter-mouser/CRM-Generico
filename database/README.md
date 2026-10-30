# database/ — PostgreSQL (etapa 2)

## Qué agregar
- `migrations/`: scripts versionados con Flyway (`V1__tiendas_usuarios_roles.sql`, `V2__productos_ventas.sql`, ...).
- `seeds/`: datos de prueba (tienda demo, productos y ventas de ejemplo).
- `diagrams/`: diagrama entidad-relación del modelo inicial.
- `backups/`: scripts de copia de seguridad y restauración (`pg_dump`); nunca copias con datos reales dentro del repositorio.

## Reglas
- Toda tabla de negocio lleva `tienda_id`.
- `producto.stock` admite valores negativos.
- Los campos personalizados se guardan en columnas JSONB.
