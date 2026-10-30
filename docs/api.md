# API del backend

Contrato que debe ofrecer el backend para reemplazar `core/store.js`. Todas las rutas cuelgan de `/api`, usan JSON y exigen sesión (cookie HttpOnly); sin sesión responden `401`. Los errores de negocio responden `400` con `{ "mensaje": "..." }` en español, que la interfaz muestra tal cual. Los valores en pesos son enteros; las fechas son ISO 8601.

## Productos e inventario
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /productos?consulta=` | `buscarProductos` | Filtra por ID, nombre, referencia, costo o stock |
| `POST /productos` | `agregarProducto` | `{ id?, referencia, nombre, costo, existencias }` |
| `PUT /productos/{id}` | edición en línea | Cambia referencia, nombre, costo o stock |
| `POST /productos/importacion` | `importarProductos` | Lista de filas del CSV; devuelve `{ agregados, actualizados }` |
| `GET /facturas` | lista de facturas | Últimas facturas de compra |
| `POST /facturas` | `registrarFactura` | `{ numero, proveedor, fecha, items[] }`; suma stock y actualiza el costo |

## Ventas y clientes
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /ventas?desde=&hasta=` | historial y reportes | Ventas con sus items |
| `POST /ventas` | `registrarVenta` | `{ cliente, metodo, items[] }`; descuenta stock; valida existencias y Fiado |
| `GET /clientes?consulta=` | `buscarClientes` | Incluye `deuda` calculada |
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
| `POST /ventas/{id}/devoluciones` | `devolverProductos` | `{ cantidades: { productoId: n }, motivo }`; permiso `ventas:eliminar` |
| `POST /ventas/{id}/anulacion` | `anularVenta` | `{ motivo }`; rechaza días cerrados; devuelve stock y dinero |
| `GET /devoluciones` | `estado.devoluciones` | Devoluciones y anulaciones |
| `GET /auditoria` | `registrosDeAuditoria` | Solo lectura, filtros por módulo y texto |
| `GET /copias` / `POST /copias/restauracion` | `descargarCopia`, `restaurarCopia` | Valida con `docs/validacion.md` |
| `GET /pagos` | historial de pagos | |
| `POST /pagos/abonos` | `registrarAbono` | `{ clienteId, valor, metodo }` |
| `POST /pagos/proveedores` | `registrarPagoProveedor` | `{ proveedor, concepto, valor, metodo }` |
| `GET /proveedores/saldos` | `proveedoresConSaldo` | Proveedores con saldo pendiente |

## Reportes
| Método y ruta | Función actual | Descripción |
|---|---|---|
| `GET /reportes/ventas?desde=&hasta=` | `reporteDeVentas` | Total, cantidad, ticket promedio, utilidad, por método y más vendidos |
| `GET /reportes/stock-bajo` | `productosConStockBajo` | Productos con 5 unidades o menos |
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
