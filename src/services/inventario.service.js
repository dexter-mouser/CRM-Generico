// Reglas de negocio del inventario: productos (costo, precio de venta, IVA, categoría y stock mínimo),
// importación, facturas de compra y kardex (historial de entradas y salidas de cada producto).
import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo, siguienteNumero } from '../core/codigos.js';
import { ultimoDiaCerrado } from './contabilidad.service.js';
import { exigirPermiso, nombreDeUsuario } from '../core/autorizacion.js';
import { exigirFecha, exigirTexto, validarLineas, validarProducto } from '../core/validacion.js';
import { registrarAuditoria } from './auditoria.service.js';

const quitarTildes = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const buscarProductoPorId = (id) => estado.productos.find((producto) => producto.id === id);

// Campos que se editan en línea en la cuadrícula del inventario (el ID no se edita porque lo usan ventas y facturas)
export const CAMPOS_EDITABLES = ['referencia', 'nombre', 'categoria', 'costo', 'precio', 'iva', 'stockMinimo', 'existencias'];

export const categorias = () => [...new Set(estado.productos.map((producto) => producto.categoria).filter(Boolean))].sort();

// El ID de producto es solo números: el siguiente es el mayor que exista más uno
const siguienteIdProducto = () => String(siguienteNumero(estado.productos.map((producto) => producto.id)));

// Deja constancia de un cambio de stock que no viene de un documento (edición manual, creación o importación)
function registrarAjuste(productoId, cantidad, motivo) {
  if (!cantidad) return;
  estado.ajustesInventario.push({
    id: siguienteCodigo(estado.ajustesInventario.map((ajuste) => ajuste.id), 'AJ', 4),
    fecha: new Date().toISOString(),
    productoId,
    cantidad,
    motivo,
    usuario: nombreDeUsuario(),
  });
}

// Cada palabra escrita debe aparecer en algún atributo: ID, nombre, referencia, categoría, costo, precio o stock.
// Primero va el producto cuyo ID o referencia es exactamente lo escrito (así Enter elige el ID tecleado o escaneado).
export function buscarProductos(consulta = '') {
  const terminos = quitarTildes(consulta).split(/\s+/).filter(Boolean);
  const exacto = quitarTildes(consulta.trim());
  const esExacto = (producto) => quitarTildes(producto.id) === exacto || quitarTildes(producto.referencia) === exacto;
  return estado.productos.filter((producto) => {
    const texto = quitarTildes([producto.id, producto.nombre, producto.referencia, producto.categoria, producto.costo, producto.precio, producto.existencias].join(' '));
    return terminos.every((termino) => texto.includes(termino));
  }).sort((a, b) => Number(esExacto(b)) - Number(esExacto(a)));
}

// Filtro por columna: cada casilla con texto debe coincidir con su atributo (id, referencia, nombre, costo, existencias)
export function filtrarProductos(filtros) {
  const condiciones = Object.entries(filtros).filter(([, texto]) => texto.trim());
  return estado.productos.filter((producto) =>
    condiciones.every(([columna, texto]) => quitarTildes(producto[columna]).includes(quitarTildes(texto.trim()))));
}

// Edición en línea de un campo de un producto
export function actualizarProducto(id, campo, valor) {
  exigirPermiso('inventario', 'editar', 'editar productos');
  const producto = buscarProductoPorId(id);
  if (!producto) throw new Error('El producto no existe');
  if (!CAMPOS_EDITABLES.includes(campo)) throw new Error('Ese campo no se puede editar');
  const limpio = validarProducto({ ...producto, [campo]: valor });
  const anterior = producto[campo];
  producto[campo] = limpio[campo];
  if (campo === 'existencias') registrarAjuste(producto.id, producto.existencias - anterior, 'Ajuste manual de stock');
  registrarAuditoria('inventario', 'Producto editado', `${producto.id} · ${campo} = ${producto[campo]}`);
  guardarEstado();
}

// Código exacto (ID o referencia, sin importar mayúsculas): lo que escribe un lector de código de barras
export const buscarProductoPorCodigo = (codigo) => {
  const buscado = String(codigo).trim().toLowerCase();
  if (!buscado) return null;
  return estado.productos.find((producto) => producto.id.toLowerCase() === buscado || producto.referencia.toLowerCase() === buscado) ?? null;
};

export function agregarProducto(datos) {
  exigirPermiso('inventario', 'crear', 'crear productos');
  const limpio = validarProducto(datos);
  const idFinal = limpio.id || siguienteIdProducto();
  if (buscarProductoPorId(idFinal)) throw new Error(`Ya existe un producto con el ID ${idFinal}`);
  const producto = { ...limpio, id: idFinal };
  estado.productos.push(producto);
  registrarAjuste(producto.id, producto.existencias, 'Stock inicial');
  registrarAuditoria('inventario', 'Producto creado', `${producto.id} · ${producto.nombre}`);
  guardarEstado();
  return producto;
}

// Importación validada: se revisan todas las filas antes de cambiar nada; si alguna falla no se importa ninguna.
// Las columnas que no trae el archivo conservan el valor actual del producto.
export function importarProductos(filas) {
  exigirPermiso('inventario', 'crear', 'importar productos');
  if (!filas.length) throw new Error('El archivo no tiene productos');
  if (filas.length > 5000) throw new Error('El archivo tiene demasiadas filas (máximo 5000)');
  const problemas = [];
  const vistos = new Set();
  const validas = filas.map((fila, posicion) => {
    try {
      const actual = fila.id ? buscarProductoPorId(String(Number(fila.id))) : null;
      const definidos = Object.fromEntries(Object.entries(fila).filter(([, valor]) => valor !== undefined));
      const completa = { costo: 0, existencias: 0, ...actual, ...definidos };
      const limpia = validarProducto(completa);
      if (limpia.id && vistos.has(limpia.id)) throw new Error(`el ID ${limpia.id} está repetido en el archivo`);
      if (limpia.id) vistos.add(limpia.id);
      return limpia;
    } catch (error) {
      problemas.push(`Fila ${posicion + 2}: ${error.message}`);
      return null;
    }
  });
  if (problemas.length) {
    const resto = problemas.length > 3 ? ` (y ${problemas.length - 3} más)` : '';
    throw new Error(`No se importó nada. ${problemas.slice(0, 3).join(' · ')}${resto}`);
  }

  let agregados = 0, actualizados = 0;
  for (const fila of validas) {
    const existente = fila.id ? buscarProductoPorId(fila.id) : null;
    if (existente) {
      const anterior = existente.existencias;
      Object.assign(existente, fila);
      registrarAjuste(existente.id, existente.existencias - anterior, 'Importación de inventario');
      actualizados++;
    } else {
      const producto = { ...fila, id: fila.id || siguienteIdProducto() };
      estado.productos.push(producto);
      registrarAjuste(producto.id, producto.existencias, 'Importación de inventario');
      agregados++;
    }
  }
  registrarAuditoria('inventario', 'Inventario importado', `${agregados} nuevos, ${actualizados} actualizados`);
  guardarEstado();
  return { agregados, actualizados };
}

// Factura de compra: suma las cantidades al stock y deja el costo de la factura como costo del producto.
// Si viene de una orden de compra, la orden queda recibida.
export function registrarFactura(datos) {
  exigirPermiso('inventario', 'crear', 'registrar facturas de compra');
  const { lineas } = datos;
  const proveedor = estado.proveedores.find((candidato) => candidato.id === datos.proveedorId);
  if (!proveedor) throw new Error('Elige el proveedor de la factura (créalo antes en Proveedores)');
  const numero = exigirTexto(datos.numero, 'el número de la factura', { maximo: 40 });
  const fecha = exigirFecha(datos.fecha, 'la fecha de la factura');
  if (!lineas.length) throw new Error('Agrega al menos un producto a la factura');
  validarLineas(lineas, 'costoUnitario', 'el costo unitario');
  if (fecha <= ultimoDiaCerrado()) throw new Error('Ese día ya tiene la contabilidad cerrada: elige una fecha posterior');
  const repetida = estado.facturas.some((factura) => factura.numero === numero && factura.proveedorId === proveedor.id);
  if (repetida) throw new Error('Esa factura de ese proveedor ya fue ingresada');
  const orden = datos.ordenId ? estado.ordenesCompra.find((candidata) => candidata.id === datos.ordenId) : null;
  if (datos.ordenId && (!orden || orden.estado !== 'abierta')) throw new Error(`La orden ${datos.ordenId} ya no está abierta`);

  const items = lineas.map(({ productoId, nombre, cantidad, costoUnitario }) => ({ productoId, nombre, cantidad, costoUnitario }));
  const factura = {
    numero,
    proveedorId: proveedor.id,
    proveedor: proveedor.nombre,
    fecha,
    usuario: nombreDeUsuario(),
    ordenId: orden?.id ?? '',
    items,
    total: items.reduce((acumulado, item) => acumulado + item.cantidad * item.costoUnitario, 0),
  };
  estado.facturas.push(factura);
  if (orden) {
    orden.estado = 'recibida';
    orden.facturaNumero = numero;
  }
  registrarAuditoria('inventario', 'Factura de compra', `${factura.numero} · ${factura.proveedor} · $ ${factura.total}${orden ? ` · orden ${orden.id}` : ''}`);
  items.forEach((item) => {
    const producto = buscarProductoPorId(item.productoId);
    if (producto) {
      producto.existencias += item.cantidad;
      producto.costo = item.costoUnitario;
    }
  });
  guardarEstado();
  return factura;
}

// --- Kardex ----------------------------------------------------------------------------------------------
// Historial de un producto armado con los documentos que mueven stock. El saldo se calcula hacia atrás desde
// el stock actual, así siempre termina en lo que hay hoy.
export function kardexDeProducto(productoId) {
  const producto = buscarProductoPorId(productoId);
  if (!producto) return [];
  const movimientos = [];
  const agregar = (fecha, documento, detalle, cantidad, costo = null) => movimientos.push({ fecha, documento, detalle, cantidad, costo });
  const deItems = (items) => items.filter((item) => item.productoId === productoId).reduce((suma, item) => suma + item.cantidad, 0);

  estado.facturas.forEach((factura) => {
    const item = factura.items.find((candidato) => candidato.productoId === productoId);
    // La factura de compra solo guarda el día: se ubica al comenzarlo, antes de las ventas de ese día
    if (item) agregar(`${factura.fecha}T00:00:00`, factura.numero, `Compra a ${factura.proveedor}`, item.cantidad, item.costoUnitario);
  });
  estado.ventas.forEach((venta) => {
    const remision = venta.documentoOrigen ? estado.documentos.find((documento) => documento.id === venta.documentoOrigen && documento.tipo === 'remision') : null;
    const entregado = remision ? deItems(remision.items) : 0;
    const vendido = deItems(venta.items);
    // Al facturar una remisión solo mueve stock la diferencia con lo ya entregado
    const cantidad = remision ? entregado - vendido : -vendido;
    if (cantidad) agregar(venta.fecha, venta.id, remision ? `Factura desde ${remision.id}` : `Venta a ${venta.cliente}`, cantidad);
  });
  estado.documentos.filter((documento) => documento.tipo === 'remision').forEach((remision) => {
    const cantidad = deItems(remision.items);
    if (cantidad) agregar(remision.fecha, remision.id, `Remisión a ${remision.cliente}`, -cantidad);
  });
  estado.devoluciones.forEach((nota) => {
    const cantidad = deItems(nota.items);
    if (cantidad) agregar(nota.fecha, nota.id, `${nota.tipo === 'anulacion' ? 'Anulación' : 'Devolución'} de ${nota.ventaId}`, cantidad);
  });
  estado.ajustesInventario.filter((ajuste) => ajuste.productoId === productoId)
    .forEach((ajuste) => agregar(ajuste.fecha, ajuste.id, `${ajuste.motivo} (${ajuste.usuario})`, ajuste.cantidad));
  // Una remisión anulada devolvió lo entregado; se registra con la fecha del documento por no guardar otra
  estado.documentos.filter((documento) => documento.tipo === 'remision' && documento.anulado).forEach((remision) => {
    const cantidad = deItems(remision.items);
    if (cantidad) agregar(remision.fecha, remision.id, `Anulación de ${remision.id}`, cantidad);
  });

  movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  let saldo = producto.existencias;
  for (let posicion = movimientos.length - 1; posicion >= 0; posicion--) {
    movimientos[posicion].saldo = saldo;
    saldo -= movimientos[posicion].cantidad;
  }
  return movimientos;
}

// Productos en o por debajo de su stock mínimo
export const productosBajoMinimo = () => estado.productos
  .filter((producto) => producto.existencias <= (producto.stockMinimo ?? 0))
  .sort((a, b) => a.existencias - b.existencias);
