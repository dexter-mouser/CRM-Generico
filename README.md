# Genérico — CRM para tiendas pequeñas

Panel de gestión para tiendas pequeñas que reemplaza el cuaderno donde se anotan ventas, se lleva el inventario y se cuadra la caja. Pensado como plantilla base: un mismo código que se adapta a cada cliente, con estructura y funciones personalizables por tienda.

## Características
- **Acceso:** `index.html` es la única página pública. Se ingresa con un correo autorizado o con usuario y clave (el ojo de la clave muestra u oculta lo escrito). Todas las demás páginas exigen sesión: sin sesión vigente (o con la sesión vencida, a las 8 horas) redirigen al ingreso y, al entrar, devuelven a la página pedida. "Mantener la sesión en este dispositivo" la conserva al cerrar el navegador. "Cerrar sesión", al final del menú lateral, la termina.
- **Páginas por vista:** cada vista es su propio archivo HTML (`panel.html`, `nueva-venta.html`, `ventas.html`, `inventario.html`, ...) con el mismo menú superior y lateral.
- **Marca:** logo "Genérico", una G decorada con un anillo fino y un punto, en grises. Está en el ingreso, el menú superior y el icono de la pestaña, y cambia con el modo claro u oscuro.
- **Interfaz:** menú superior de ancho completo y menú lateral debajo. El botón de tema es un icono (luna en modo claro, sol en modo oscuro) en el menú superior. El menú lateral se recoge a solo iconos y recuerda la elección en todas las páginas.
- **Diseño:** grises neutros, bordes suaves, modo claro y oscuro, español y moneda COP. Prioridad en computador, con diseño adaptado a celular.
- **Campos numéricos:** se escriben a mano (sin flechas de aumento ni rueda del ratón); solo admiten dígitos, y el stock admite un "-" inicial.
- **Confirmaciones:** cada cambio aplicado (producto, venta, factura, documento, orden de tarjetas, tema) muestra el aviso "... correctamente"; las advertencias se muestran sin la marca de éxito.
- **Animaciones:** esqueletos al cargar cada página y contadores/barras que suben de 0 al valor actual. Respeta la preferencia de reducir animaciones del dispositivo.
- **Panel:** tarjetas de resumen reordenables, gráfica semanal y últimas ventas. Al arrastrar, la tarjeta se levanta y sigue al puntero, un hueco punteado marca el destino y las demás tarjetas se deslizan a su nueva posición. El orden se guarda en el instante de soltar. Con teclado: flechas sobre el icono de agarre.
- **Registrar venta** (`nueva-venta.html`, independiente del historial): una venta puede tener varios productos. El buscador filtra por cualquier atributo (ID, nombre, referencia, costo o stock) y acepta varias palabras; Enter elige el primer resultado. Cantidad y valor unitario se escriben a mano; el valor sugerido es el de la última venta de ese producto. Cada producto descuenta su cantidad del stock.
- **Ventas** (`ventas.html`): historial con número, fecha, cliente, productos, forma de pago y total.
- **Inventario:** cada producto tiene ID (único, automático si se deja vacío), referencia, nombre, costo y stock (puede ser negativo). Se edita en línea; el ID no se edita porque lo usan las ventas y las facturas. Guarda costo, no precio de venta.
- **Facturas de compra:** el botón "Ingresar factura" abre un panel con proveedor, número, fecha y productos (con el mismo buscador). Al registrarla suma las cantidades al stock y deja el costo de la factura como costo del producto. No admite repetir el número de factura de un mismo proveedor.
- **Documentos:** el inventario se descarga y se carga como CSV, un documento de texto que abren e importan directamente las hojas de cálculo del navegador (por ejemplo Google Sheets), sin depender de Excel.
- **Pantallas de prueba:** Clientes, Caja, Pagos, Reportes, Roles y permisos, Ajustes.

## Acceso de prueba
| Forma | Datos |
|---|---|
| Correo | `demo@generico.com` |
| Usuario y clave | `admin` / `admin123` |

Se definen en `src/config/acceso.js`. La verificación ocurre en el navegador, por lo que sirve para recorrer la interfaz pero **no protege datos reales**: cualquiera puede alterar el almacenamiento del navegador. La protección real la da el servidor (ver Seguridad).

## Estructura
```
crm-tiendas/
├── index.html                  Ingreso (única página pública)
├── panel.html, nueva-venta.html, ventas.html, clientes.html, inventario.html,
│   caja.html, pagos.html, reportes.html, roles.html, ajustes.html
│                               Una página protegida por vista (mismo shell)
├── package.json
├── styles/
│   ├── style.css               Punto de entrada: importa todos los demás
│   ├── tono.css                Colores y tema claro/oscuro (variables)
│   ├── base.css                Reinicio y tipografía
│   ├── layout.css              Encabezado, menú lateral, contenido, marca
│   ├── components.css          Tarjetas, botones, tablas, formularios, selector, arrastre
│   ├── animations.css          Esqueletos de carga, entradas y barras
│   └── acceso.css              Pantalla de ingreso
├── src/
│   ├── main.js                 Arranque de las páginas protegidas (verifica sesión y monta el menú)
│   ├── main-acceso.js          Arranque de index.html
│   ├── config/                 nav.js (menú), routes.js (módulo de cada vista), acceso.js (usuarios de prueba)
│   ├── core/                   previo, sesion, router, store, preferencias, template, tema, animate,
│   │                           numeros, codigos, format, iconos, dom
│   ├── components/             header/, sidebar/, logo/, toast/ (aviso), reordenar/ (arrastrar y soltar),
│   │                           selector-productos/ (buscador con filtro)
│   ├── modules/                acceso/, panel/, nueva-venta/, ventas/, inventario/ (incluye factura.js),
│   │                           placeholder/ (cada uno con su .html y su .js)
│   ├── services/               inventario.service.js, ventas.service.js (reglas de negocio),
│   │                           csv.service.js (documentos), api.js (cliente de la API)
│   └── data/seed.js            Datos de prueba
├── backend/                    API Spring Boot
├── database/                   Migraciones y datos de prueba
├── themes/                     Temas por cliente
├── assets/                     logos/ (icono.svg, logo.svg, logo-oscuro.svg), iconos y plantillas
├── docs/                       Documentación
├── deploy/                     Docker y despliegue
├── tests/                      Pruebas
└── README.md
```
Cada carpeta futura incluye un `README.md` con lo que se debe agregar.

## Cómo ejecutarlo
Las páginas usan módulos ES y cargan sus plantillas HTML con `fetch`, por lo que deben abrirse desde un servidor local (no con doble clic):
```
npm start          # usa npx serve
# o bien
python3 -m http.server 8000
```
Luego abre la dirección que indique (por ejemplo `http://localhost:8000`). Los datos de prueba se guardan en el navegador (`localStorage`) y se comparten entre páginas; para volver a los datos iniciales, borra los datos del sitio.

## Cómo funciona el acceso
- `src/core/previo.js` corre antes de dibujar cada página: aplica el tema guardado y, en las páginas marcadas con `<html data-protegida>`, redirige a `index.html?siguiente=<página>` si no hay sesión vigente.
- `src/core/sesion.js` guarda y valida la sesión (`sessionStorage`, o `localStorage` si se mantiene la sesión).
- `index.html` solo acepta como destino de regreso páginas del menú, nunca direcciones externas.

## Cómo agregar un módulo
1. Crea `src/modules/<nombre>/<nombre>.html` (marcado y `<template>` para filas repetidas) y `<nombre>.js`.
2. En el `.js` exporta `dibujar(contexto)`, que devuelve el HTML, y opcionalmente `montar(raiz, contexto)`, que enlaza los eventos. El contexto ofrece `aviso(texto)` y `alerta(texto)` para los mensajes, y `redibujar()`.
3. Agrega la entrada en `src/config/nav.js` y la ruta en `src/config/routes.js`.
4. Crea `<nombre>.html` en la raíz copiando otra página protegida: cambia el título y `data-vista="<nombre>"`.

Los campos numéricos se declaran con `data-numero="entero"` o `data-numero="entero-negativo"`. Las reglas de negocio (registrar ventas y facturas, buscar productos) viven en `src/services/`, sin tocar la interfaz.

Plantillas: `{{x}}` inserta texto escapado, `{{{x}}}` inserta HTML y `<!--{{{x}}}-->` se usa dentro de tablas.

## Formato del CSV de inventario
Una fila de encabezado con las columnas `ID`, `Referencia`, `Producto`, `Costo` y `Stock` (acepta separador coma o punto y coma). Al cargar el archivo se actualizan los productos con el mismo ID y se crean los nuevos (si la fila no trae ID, se asigna uno). El stock acepta valores negativos. Para trabajar en Google Sheets: súbelo a Drive, edítalo y descárgalo de nuevo como CSV.

## Arquitectura objetivo
- **Frontend:** React (Vite), flexbox, dnd-kit para los widgets, skeletons y contadores animados.
- **Backend:** Spring Boot (REST) con Spring Security.
- **Base de datos:** PostgreSQL, con JSONB para campos personalizados.
- **Despliegue:** Docker; local con docker-compose y luego nube (Render, Railway o VPS).

## Seguridad
- Ingreso solo con Google (OAuth2/OIDC): el servidor valida el token, solo entran correos autorizados por el dueño, la sesión va en cookie HttpOnly.
- El servidor debe verificar la sesión en cada petición y en cada página protegida; la verificación del navegador es solo de comodidad.
- Aislamiento multitienda: `tienda_id` en cada tabla y en cada consulta.
- Roles y permisos en tablas, que el dueño puede crear y eliminar desde el menú.
- Auditoría de cambios.

## Modelo de datos inicial
`tienda`, `usuario`, `membresia` (usuario, tienda, rol), `rol`, `permiso`, `rol_permiso`, `cliente`, `producto` (ID, referencia, nombre, costo, stock que puede ser negativo), `factura_compra` y `factura_compra_item`, `venta` y `venta_item` (varios productos por venta), `pago`, `caja_sesion`, `movimiento_caja`, `campo_definicion`, `campo_valor` (JSONB), `widget_panel` (posición y tamaño por usuario), `tema_tienda` (tokens de color), `auditoria`.

## Etapas
1. Pantallas, páginas por vista y acceso de prueba.
2. Base de datos, API, ingreso con Google y roles.
3. Frontend con datos reales: menús, tema y panel con widgets.
4. Ventas, pagos y cuadre de caja.
5. Campos personalizados, integración con documentos de Google desde el servidor y auditoría.
6. Despliegue en la nube.
