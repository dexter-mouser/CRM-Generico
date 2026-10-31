# Contexto del proyecto Genérico

Documento de traspaso para continuar el trabajo en un chat nuevo. Léelo completo antes de cambiar código.

## Qué es
CRM "Genérico" para tiendas pequeñas: ventas, inventario, clientes, caja, contabilidad, roles y auditoría. Plantilla base que se adapta a cada tienda.

- **Frontend:** JavaScript puro con módulos ES, una página HTML por vista, datos en `localStorage`. Solo `index.html` (ingreso) es pública.
- **Backend:** Spring Boot 3.3.5, Java 21, PostgreSQL (Supabase como opción de alojamiento), Flyway, JWT en cookie, cabecera `X-Generico: 1` contra CSRF, BCrypt, multitenant por `tienda_id`, auditoría de solo añadir.
- **Ubicación en el PC del usuario:** `C:\VSCODE\crm-tiendas\crm-tiendas` (repositorio git; el commit lo hace el usuario).

## Reglas fijas del usuario
1. Nombres de código (variables, constantes, funciones, clases) en español.
2. Nombres de archivo estándar: `index.html`, `style.css`, `tono.css` (colores y tema). Código limpio, indentado y bien separado por carpetas.
3. Campos numéricos escritos a mano, sin flechas de ±1 (`data-numero="entero"`).
4. Todo cambio aplicado muestra un aviso "… correctamente" (`contexto.aviso`); las advertencias usan `contexto.alerta`.
5. El README describe solo utilidades y funcionamiento, nunca cambios entre versiones.
6. Respuestas breves y precisas, en español.

## Estructura
```
index.html, panel.html, nueva-venta.html, ventas.html, clientes.html, inventario.html,
caja.html, contabilidad.html, pagos.html, reportes.html, auditoria.html, roles.html, ajustes.html,
seguimiento.html, embudo.html, proveedores.html, tiendas.html, bodegas.html, empleados.html
src/
  main.js, main-acceso.js     Arranque (la sesión se exige en main.js)
  config/                     acceso.js, entorno.js, nav.js, permisos.js, routes.js
  core/                       store, plantillas, tema, sesión, validación, formato, router, tienda (tienda activa)
  components/                 cuadricula-datos, recibo (comprobantes), logo, etc.
  modules/<vista>/            <vista>.html + <vista>.js
  services/                   reglas de negocio (ventas, caja, clientes, roles, ...)
  data/seed.js                datos de ejemplo
styles/                       style.css, tono.css, components.css, cuadricula.css, ...
backend/                      Spring Boot (migraciones Flyway V1..V3)
docs/                         api.md, seguridad.md, validacion.md
```

## Contrato de los módulos
- `dibujar(contexto)` devuelve el HTML; `montar(raiz, contexto)` enlaza los eventos.
- `contexto` ofrece `aviso`, `alerta`, `redibujar`, `id`, `etiqueta` y `seccion` (la parte pedida con `?seccion=`).
- Menú: `MENU` (lista plana para permisos, roles y acceso) y `GRUPOS` (6 grupos con sus secciones `{etiqueta, modulo, seccion?}`) en `config/nav.js`. Una página dividida marca sus partes con `data-seccion`; el router oculta las demás y dibuja las pestañas del grupo. `ACCESOS_PRINCIPALES` alimenta el panel.
- Encabezado: buscador de pantallas (`Ctrl+K`), selector de tienda activa, botón "Vender". En celular (≤800 px) el menú lateral es una barra inferior con los grupos.
- Plantillas: `{{x}}` escapa, `{{{x}}}` inserta HTML, `<!--{{{x}}}-->` dentro de tablas. Funciones: `cargarHtml`, `seccion`, `repetir`, `rellenar`.
- Cuadrícula reutilizable (`components/cuadricula-datos`): columnas `{clave, titulo, ancho, alinear, filtrable, html}`; búsqueda debajo de cada columna; las acciones por fila usan delegación de eventos.
- Permisos: `puede(modulo, accion)` y `exigirPermiso`. El rol Propietario es protegido.

## Documentos de venta
- **Factura de venta** (F1): descuenta stock y mueve caja o deuda. En efectivo exige caja abierta.
- **Remisión** (R1): descuenta stock sin cobrar; se puede pasar a factura. Lo remitido que no quede en la factura vuelve al stock.
- **Cotización** (C1): vigencia de 15 días; no toca stock ni dinero; se puede pasar a remisión o a factura.
- Facturas, remisiones y cotizaciones comparten un solo consecutivo (una letra y un número). Al pasar un documento a otro se conserva el número: C5 → R5 → F5.
- Las notas de devolución (ND1) y de anulación (NA1) tienen cada una su propio consecutivo.
- Los IDs de productos son solo números. El método de pago a crédito se llama "Crédito" y la deuda se relaciona con el cliente por su ID.
- Pasar a factura: botón "Facturar" en Ventas → `nueva-venta.html?documento=ID`. `registrarVenta` recibe `documentoOrigen`, descuenta solo lo no entregado y marca `facturadaEn`. Una factura nunca vuelve a remisión ni cotización.
- Notas ND-#### (devolución) y NA-#### (anulación), ancladas a la factura por `ventaId`, con consecutivo propio.
- Pago en efectivo: `recibido` y `devuelta` guardados en la factura; en efectivo el recibido debe ser ≥ total.

## Tiendas, bodegas y empleados
- `estado.tiendas` (T-01 Centro → B-01, T-02 Norte → B-02), `estado.bodegas` (B-03 central sin tienda), `estado.traslados` (TR-0001), `estado.empleados` (E-001…).
- Tienda activa en preferencias (`generico.tienda-activa`), `core/tienda.js`: `tiendaActivaId`, `elegirTienda`, `exigirTiendaActiva`, `enTiendaActiva`, `bodegaDeTienda`. `usuario.tiendas` limita el alcance (vacío = todas). "todas" solo consulta: no vende, no mueve caja ni stock.
- Stock por bodega: `producto.stock = {'B-01': n}`; `producto.existencias` es el total. `existenciasVisibles` da el de la bodega activa. Un traslado enviado no cuenta en ninguna bodega hasta recibirlo.
- Caja por tienda (`caja.tiendaId`); ventas, documentos, notas y pagos llevan `tiendaId` (y `bodegaId` los que mueven stock); facturas de compra llevan `bodegaId`.
- Kardex por bodega (`kardexDeProducto(id, bodegaId)`), incluye traslados.

## Acceso de prueba
- Correo: `demo@generico.com` (Propietario, todas las tiendas), `camila@generico.com` (Cajero, solo Tienda Centro), `felipe@generico.com` (Bodega). Se puede escribir solo la parte anterior a la arroba.
- Usuario `admin` / clave `admin123`.
- Las cuentas están en `CUENTAS_PRUEBA` (`src/config/acceso.js`) y el ingreso las muestra con botón "Copiar".
- Todos los correos de personas terminan en `@generico.com` (`exigirCorreoDeTienda`; igual en el backend).

## Estado actual
Hecho y probado en el navegador (escritorio y móvil, sin errores de consola):
- Tipos de documento, notas ND/NA, comprobante ampliado, pago en efectivo con devuelta.
- Atajos de teclado dentro de los botones, vista previa por rol en Roles, enlace a Auditoría.
- Cuadrícula en todos los módulos con datos (Panel y Reportes conservan tablas de resumen).
- Cuentas de prueba en el ingreso y dominio `@generico.com`.
- Funciones de CRM (ficha, seguimiento, embudo, cartera, IVA/kardex, proveedores, indicadores).
- Menú por grupos con pestañas, buscador de pantallas, barra inferior en celular y panel con accesos principales.
- Varias tiendas, bodegas con traslados y empleados con metas y comisiones.

## Pendiente
- Backend: no se ha compilado ni ejecutado (sin Maven en el entorno de trabajo); solo hay revisión de sintaxis.
- Backend: faltan los endpoints de remisión y cotización (las tablas ya existen en `V3__documentos_pago_efectivo.sql`).
- Backend (punto 9): faltan los módulos de CRM, tiendas, bodegas, traslados y empleados (tablas, entidades y endpoints); se hará módulo por módulo.
- Opcional: botón "Ver como este rol" que cambie el menú temporalmente sin cerrar sesión.
- Antes de producción: quitar el bloque de cuentas de prueba del ingreso.

## Cómo probar
1. Abrir `index.html` con Live Server desde la carpeta del proyecto (o `npm start`).
2. Probar en escritorio (1280 px) y móvil (390 px), sin errores en consola ni desbordes.
3. Si no se ven los cambios: Ctrl+F5 y revisar que el servidor sirva la carpeta correcta.

## Funciones de CRM
- **Clientes:** documento (CC, NIT, CE, PAS, TI), tipo de persona, etiquetas, autorización de datos (Ley 1581), cupo de crédito y plazo. Sin cumpleaños. Ficha con seguimiento, compras, cartera, cotizaciones y remisiones, abonos y devoluciones.
- **Seguimiento:** actividades (llamada, WhatsApp, visita, correo, nota) y tareas con fecha y responsable.
- **Embudo:** cotización = oportunidad (enviada, en negociación, ganada, perdida). Perdida exige motivo; la cotización vencida sin cerrar genera una alerta para su vendedor (campana del encabezado; el Propietario ve todas).
- **Cartera:** vencimiento por factura a crédito, cupo por cliente y cartera por edades (abonos aplicados a la factura más antigua).
- **Inventario:** precio de venta con IVA incluido, tarifa de IVA (0, 5, 19), categoría, stock mínimo y kardex calculado desde los documentos y los ajustes manuales.
- **Proveedores:** entidad propia (PV-001) con órdenes de compra (OC-0001) que se reciben con la factura de compra.
- **Reportes:** clientes nuevos y recurrentes, inactivos (más de 60 días), conversión de cotizaciones y ventas por vendedor.

## Entorno de trabajo
- Copia en la nube: `/home/claude/crm`, servida con `python3 -m http.server 8123` para pruebas con Playwright.
- Maven Central está bloqueado en la nube: el backend no se puede compilar allí.
- Los archivos cambiados se copian al PC con `SendUserFile` y `device_commit_files` (máximo 50 por llamada). No se pueden borrar archivos del PC desde la nube: se borran a mano.
- No se puede ejecutar git en el PC.
