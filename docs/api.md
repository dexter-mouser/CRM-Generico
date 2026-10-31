# API del backend

Contrato que debe ofrecer el backend para reemplazar `core/store.js`. Todas las rutas cuelgan de `/api`, usan JSON y exigen sesión (cookie HttpOnly); sin sesión responden `401`. Los errores de negocio responden `400` con `{ "mensaje": "..." }` en español, que la interfaz muestra tal cual. Los valores en pesos son enteros; las fechas son ISO 8601.

## Productos e inventario
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /productos?consulta=` | `buscarProductos` | Filtra por ID, nombre, referencia, costo o stock |
| `POST /productos` | `agregarProducto` | `{ id?, referencia, nombre, categoria, costo, precio, iva, stockMinimo, existencias }`; `id` solo números (vacío: el mayor más uno) |
| `PUT /productos/{id}` | edición en línea | Cambia referencia, nombre, costo o stock |
| `POST /productos/importacion` | `importarProductos` | Lista de filas del CSV; devuelve `{ agregados, actualizados }` |
| `GET /facturas` | lista de facturas | Últimas facturas de compra |
| `POST /facturas` | `registrarFactura` | `{ numero, proveedorId, fecha, ordenId?, items[] }`; suma stock, actualiza el costo y deja recibida la orden de compra |

## Ventas y clientes
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /ventas?desde=&hasta=` | historial y reportes | Ventas con sus items |
| `POST /ventas` | `registrarVenta` | `{ cliente, metodo, recibido?, observaciones?, items[] }`; factura de venta: descuenta stock, valida existencias y Crédito; en efectivo exige caja abierta; código `F1`, `F2`… del consecutivo compartido con remisiones y cotizaciones; en efectivo `recibido` ≥ total y la devuelta se calcula |
| `POST /documentos` | `registrarVenta` (`tipo` remision o cotizacion) | Remisión (R): descuenta stock sin cobrar. Cotización (C): no mueve nada. `documentoOrigen` opcional: la cotización pasa a remisión o factura y la remisión a factura, conservando el número. **Pendiente en el backend** (tablas `documento` en las migraciones V3 y V4) |
| `POST /documentos/{id}/anulacion` | `anularDocumento` | `{ motivo }`; la remisión devuelve el stock; no si ya se pasó a otro documento |
| `GET /clientes` | `estado.clientes` | Incluye `deuda` calculada; la búsqueda por columna se hace en la cuadrícula |
| `POST /clientes` | `agregarCliente` | `{ nombre, telefono, correo, direccion }` |
| `PUT /clientes/{id}` | `actualizarCliente` | Si cambia el nombre, actualiza sus ventas |
| `DELETE /clientes/{id}` | `eliminarCliente` | Rechaza si tiene deuda |
| `GET /clientes/{id}/ventas` | `ventasDeCliente` | Historial del cliente |

## Caja y pagos
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /cajas` | `cajaAbierta`, cierres | Cajas con su resumen |
| `POST /cajas` | `abrirCaja` | `{ base }`; rechaza si ya hay una abierta |
| `POST /cajas/actual/movimientos` | `registrarMovimiento` | `{ tipo, concepto, valor }` |
| `POST /cajas/actual/cierre` | `cerrarCaja` | `{ contado }`; devuelve esperado y diferencia |
| `GET /contabilidad` | `estado.contabilidad` | Días cerrados y días pendientes |
| `POST /contabilidad/cierres` | `cerrarDia` | `{ dia }`; solo el día pendiente más antiguo, y sin caja abierta |
| `DELETE /contabilidad/cierres/ultimo` | `reabrirUltimoDia` | `{ motivo }`; permiso `contabilidad:reabrir`; solo el último día cerrado |
| `POST /ventas/{id}/devoluciones` | `devolverProductos` | `{ cantidades: { productoId: n }, motivo }`; permiso `ventas:eliminar`; genera la nota de devolución ND1 (consecutivo propio) |
| `POST /ventas/{id}/anulacion` | `anularVenta` | `{ motivo }`; rechaza días cerrados; devuelve stock y dinero; genera la nota de anulación NA1 (consecutivo propio) |
| `GET /devoluciones` | `estado.devoluciones` | Notas de devolución y de anulación, ancladas a su factura (`ventaCodigo`) |
| `GET /auditoria` | `registrosDeAuditoria` | Solo lectura, filtros por módulo y texto |
| `GET /copias` / `POST /copias/restauracion` | `descargarCopia`, `restaurarCopia` | Valida con `docs/validacion.md` |
| `GET /pagos` | historial de pagos | |
| `POST /pagos/abonos` | `registrarAbono` | `{ clienteId, valor, metodo }` |
| `POST /pagos/proveedores` | `registrarPagoProveedor` | `{ proveedorId, concepto, valor, metodo }` |
| `GET /proveedores/saldos` | `proveedoresConSaldo` | Proveedores con saldo pendiente |

## CRM (pendiente en el backend)
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /clientes/{id}/ficha` | ficha en `clientes.js` | Datos, indicadores, compras, cartera, documentos, abonos, devoluciones y actividades |
| `GET /cartera` | `carteraPorEdades` | Saldo por cliente en rangos de días de vencido |
| `GET /actividades?clienteId=&pendientes=` | `tareasPendientes`, `actividadesDeCliente` | Actividades y tareas; las pendientes se filtran por responsable salvo el Propietario |
| `POST /actividades` | `registrarActividad` | `{ clienteId, tipo, descripcion, vence?, responsableCorreo? }` |
| `POST /actividades/{id}/completar` | `completarTarea` | `{ resultado? }` |
| `GET /embudo` | `cotizaciones`, `resumenDelEmbudo` | Cotizaciones con etapa y resumen |
| `PUT /embudo/{id}/etapa` | `cambiarEtapa` | `{ etapa }` solo `enviada` o `negociacion` |
| `POST /embudo/{id}/perdida` | `marcarPerdida` | `{ motivo, detalle }` |
| `GET /alertas` | `alertasDeCotizaciones`, tareas | Alertas del usuario de la sesión |
| `GET /proveedores`, `POST /proveedores`, `PUT /proveedores/{id}`, `DELETE /proveedores/{id}` | `proveedores.service.js` | Incluye `saldo` por proveedor |
| `GET /ordenes-compra`, `POST /ordenes-compra` | `registrarOrden` | `{ proveedorId, observaciones, items[] }` |
| `POST /ordenes-compra/{id}/anulacion` | `anularOrden` | `{ motivo }` |
| `GET /productos/{id}/kardex?bodegaId=` | `kardexDeProducto` | Movimientos con saldo, de una bodega o de todas |

## Tiendas, bodegas y empleados (pendiente en el backend)
Toda petición que registra ventas, caja, pagos o stock lleva la tienda activa (cabecera `X-Tienda` o campo `tiendaId`); el servidor valida que el usuario tenga acceso a ella (`usuario.tiendas`, vacío = todas).

| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /tiendas` | `tiendasPermitidas`, `resumenDeTienda` | Tiendas del usuario con ventas del mes, caja y empleados |
| `POST /tiendas`, `PUT /tiendas/{id}` | `agregarTienda`, `actualizarTienda` | `{ nombre, ciudad, telefono, direccion, bodegaId? }`; sin bodega se crea una |
| `PUT /tiendas/{id}/estado` | `cambiarEstadoTienda` | `{ activa }`; queda al menos una activa y no con caja abierta |
| `GET /bodegas`, `POST /bodegas`, `PUT /bodegas/{id}` | `bodegas.service.js` | `{ nombre, tiendaId?, direccion }` con unidades y valor al costo |
| `PUT /bodegas/{id}/estado` | `cambiarEstadoBodega` | `{ activa }`; no con stock, traslados por recibir ni siendo la de una tienda activa |
| `GET /existencias?bodegaId=` | `existenciasEn` | Stock por producto y bodega |
| `GET /traslados`, `POST /traslados` | `enviarTraslado` | `{ origenId, destinoId, observaciones, items[] }`; descuenta el origen |
| `POST /traslados/{id}/recepcion` | `recibirTraslado` | Suma al destino |
| `POST /traslados/{id}/anulacion` | `anularTraslado` | `{ motivo }`; devuelve al origen |
| `GET /empleados`, `POST /empleados`, `PUT /empleados/{id}` | `empleados.service.js` | Ficha; `tiendasAcceso[]` actualiza el alcance del usuario |
| `PUT /empleados/{id}/estado` | `cambiarEstadoEmpleado` | `{ activo }`; retirar desactiva su usuario |
| `GET /empleados/{id}/desempeno` | `desempenoDelMes` | Ventas del mes, avance de la meta y comisión |

## Reportes
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /reportes/ventas?desde=&hasta=` | `reporteDeVentas` | Total, cantidad, ticket promedio, utilidad, por método y más vendidos |
| `GET /reportes/stock-bajo` | `productosConStockBajo` | Productos en o por debajo de su stock mínimo |
| `GET /reportes/clientes?desde=&hasta=` | `clientesNuevosYRecurrentes`, `clientesInactivos` | Nuevos, recurrentes e inactivos |
| `GET /reportes/vendedores?desde=&hasta=` | `ventasPorVendedor` | Ventas netas por vendedor |
| `GET /reportes/deudas` | `deudasDeClientes` | Clientes con deuda |
| `GET /reportes/ventas-diarias?dias=7` | `ventasPorDia` | Total por día para la gráfica del panel |

## Ajustes, roles y personas
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /ajustes`, `PUT /ajustes` | `ajustes.service.js` | Datos de la tienda, métodos de pago, existencias y recibo |
| `GET /roles`, `POST /roles` | `roles.service.js` | |
| `PUT /roles/{id}`, `DELETE /roles/{id}` | `actualizarRol`, `eliminarRol` | El rol Propietario no se modifica |
| `PUT /roles/{id}/permisos` | `establecerPermisos` | `{ modulo: [acciones] }` |
| `GET /usuarios`, `POST /usuarios` | `agregarUsuario` | |
| `PUT /usuarios/{id}` | `cambiarRolUsuario`, `cambiarEstadoUsuario` | Debe quedar al menos un propietario activo |

Las reglas de validación de `src/services/` deben repetirse en el backend: la interfaz nunca es la única barrera.
