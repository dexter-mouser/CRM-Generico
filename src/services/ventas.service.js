// Reglas de negocio de ventas. Hay tres documentos:
//  - Factura de venta: descuenta el stock, cuenta como venta y mueve caja o deuda.
//  - Remisión: descuenta el stock de lo entregado, pero no cobra; después se pasa a factura.
//  - Cotización: solo una oferta con vigencia; no toca stock ni dinero.
// Las devoluciones y anulaciones generan una nota (ND / NA) anclada a la factura original.
import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';
import { aFechaLocal } from '../core/format.js';
import { exigirPermiso, nombreDeUsuario } from '../core/autorizacion.js';
import { exigirEntero, exigirMotivo, exigirTexto, validarLineas, LIMITES } from '../core/validacion.js';
import { registrarAuditoria } from './auditoria.service.js';
import { ultimoDiaCerrado } from './contabilidad.service.js';
import { cajaAbierta } from './caja.service.js';
import { deudaDeCliente } from './clientes.service.js';

const DIAS_VIGENCIA_COTIZACION = 15;

export const TIPOS_DOCUMENTO = {
  factura: { etiqueta: 'Factura de venta', prefijo: 'V' },
  remision: { etiqueta: 'Remisión', prefijo: 'REM' },
  cotizacion: { etiqueta: 'Cotización', prefijo: 'COT' },
};

export const resumirItems = (venta) => venta.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', ');
const mismoNombre = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const buscarProducto = (id) => estado.productos.find((candidato) => candidato.id === id);
export const buscarClientePorNombre = (nombre) => estado.clientes.find((cliente) => mismoNombre(cliente.nombre, nombre));

// El inventario guarda costo, no precio: se sugiere el valor de la última venta de ese producto
export function ultimoValorDeVenta(productoId) {
  for (let posicion = estado.ventas.length - 1; posicion >= 0; posicion--) {
    const item = estado.ventas[posicion].items.find((candidato) => candidato.productoId === productoId);
    if (item) return item.valorUnitario;
  }
  return 0;
}

// --- Documentos sin factura: remisiones y cotizaciones ---------------------------------------------------
export const buscarDocumento = (id) => estado.documentos.find((documento) => documento.id === id);
export const documentoPendiente = (documento) => !documento.facturadaEn && !documento.anulado;

// Unidades ya entregadas por una remisión, por producto (para no descontar dos veces al facturarla)
const remitidas = (documento) => Object.fromEntries((documento?.tipo === 'remision' ? documento.items : []).map((item) => [item.productoId, item.cantidad]));

// Valida las líneas y arma el documento sin guardarlo: sirve para la vista previa y para registrar
export function armarVenta({ tipo = 'factura', cliente = '', metodo = 'Efectivo', lineas, recibido, observaciones = '', documentoOrigen = '' }) {
  if (!TIPOS_DOCUMENTO[tipo]) throw new Error('Elige si es factura, remisión o cotización');
  if (!lineas.length) throw new Error('Agrega al menos un producto');
  validarLineas(lineas, 'valorUnitario', 'el valor unitario');

  const origen = documentoOrigen ? buscarDocumento(documentoOrigen) : null;
  if (documentoOrigen && (!origen || !documentoPendiente(origen))) throw new Error(`El documento ${documentoOrigen} ya no se puede facturar`);
  const entregadas = remitidas(origen);

  if (tipo !== 'cotizacion' && !estado.ajustes.ventas.permitirSinExistencias) {
    for (const linea of lineas) {
      const producto = buscarProducto(linea.productoId);
      const faltante = linea.cantidad - (entregadas[linea.productoId] ?? 0);
      if (producto && faltante > producto.existencias) {
        throw new Error(`No hay existencias suficientes de ${linea.nombre} (disponibles: ${producto.existencias})`);
      }
    }
  }

  const nombreCliente = exigirTexto(cliente, 'el cliente', { obligatorio: false });
  const registrado = buscarClientePorNombre(nombreCliente);
  if (tipo === 'factura' && metodo === 'Fiado' && !registrado) {
    throw new Error('Para vender a Fiado, registra primero al cliente en Clientes y escribe su nombre completo');
  }

  const items = lineas.map(({ productoId, nombre, cantidad, valorUnitario }) => ({
    productoId,
    nombre,
    referencia: buscarProducto(productoId)?.referencia ?? '',
    cantidad,
    valorUnitario,
  }));
  const total = items.reduce((acumulado, item) => acumulado + item.cantidad * item.valorUnitario, 0);
  const ahora = new Date();
  const documento = {
    tipo,
    fecha: ahora.toISOString(),
    cliente: nombreCliente || 'Cliente sin nombre',
    clienteId: registrado?.id ?? '',
    usuario: nombreDeUsuario(),
    observaciones: exigirTexto(observaciones, 'las observaciones', { obligatorio: false, maximo: LIMITES.textoLargo }),
    items,
    total,
  };

  if (tipo === 'cotizacion') {
    documento.vigenciaHasta = new Date(ahora.getTime() + DIAS_VIGENCIA_COTIZACION * 86_400_000).toISOString();
  } else if (tipo === 'factura') {
    documento.metodo = metodo;
    documento.documentoOrigen = documentoOrigen;
    // En efectivo se puede escribir con cuánto paga el cliente; la devuelta es la diferencia
    const pagaCon = metodo === 'Efectivo' && recibido ? exigirEntero(recibido, 'el monto recibido', { minimo: 0 }) : total;
    if (pagaCon < total) throw new Error('El monto recibido no cubre el total de la venta');
    documento.recibido = pagaCon;
    documento.devuelta = pagaCon - total;
  }
  return documento;
}

const moverStock = (items, signo, entregadas = {}) => items.forEach((item) => {
  const producto = buscarProducto(item.productoId);
  if (producto) producto.existencias -= signo * (item.cantidad - (entregadas[item.productoId] ?? 0));
});

// Registra la factura, la remisión o la cotización según el tipo; devuelve el documento guardado
export function registrarVenta(datos) {
  exigirPermiso('nueva-venta', 'crear', 'registrar ventas');
  const documento = armarVenta(datos);
  const etiqueta = TIPOS_DOCUMENTO[documento.tipo].etiqueta;

  if (documento.tipo === 'factura') {
    const origen = datos.documentoOrigen ? buscarDocumento(datos.documentoOrigen) : null;
    const venta = { id: siguienteCodigo(estado.ventas.map((existente) => existente.id), 'V', 4), ...documento };
    estado.ventas.push(venta);
    moverStock(venta.items, 1, remitidas(origen));
    if (origen) origen.facturadaEn = venta.id;
    registrarAuditoria('ventas', 'Factura de venta registrada', `${venta.id} · ${venta.cliente} · ${venta.metodo} · $ ${venta.total}${origen ? ` · desde ${origen.id}` : ''}`);
    guardarEstado();
    return venta;
  }

  const prefijo = TIPOS_DOCUMENTO[documento.tipo].prefijo;
  const registro = {
    id: siguienteCodigo(estado.documentos.filter((existente) => existente.tipo === documento.tipo).map((existente) => existente.id), prefijo, 4),
    ...documento,
    facturadaEn: null,
    anulado: false,
  };
  estado.documentos.push(registro);
  if (registro.tipo === 'remision') moverStock(registro.items, 1);
  registrarAuditoria('ventas', `${etiqueta} registrada`, `${registro.id} · ${registro.cliente} · $ ${registro.total}`);
  guardarEstado();
  return registro;
}

// Una remisión o cotización sin facturar se puede anular; la remisión devuelve lo entregado al stock
export function anularDocumento(id, motivo) {
  exigirPermiso('ventas', 'eliminar', 'anular documentos');
  const documento = buscarDocumento(id);
  if (!documento) throw new Error('El documento no existe');
  const motivoLimpio = exigirMotivo(motivo);
  if (documento.facturadaEn) throw new Error(`${id} ya se facturó en ${documento.facturadaEn}: anula o devuelve esa factura`);
  if (documento.anulado) throw new Error(`${id} ya está anulado`);
  documento.anulado = true;
  documento.motivoAnulacion = motivoLimpio;
  if (documento.tipo === 'remision') moverStock(documento.items, -1);
  registrarAuditoria('ventas', `${TIPOS_DOCUMENTO[documento.tipo].etiqueta} anulada`, `${id} · ${motivoLimpio}`);
  guardarEstado();
  return documento;
}

// --- Devoluciones y anulaciones de facturas ------------------------------------------------------------
// Cada una genera una nota anclada a la factura: ND-0001 (nota de devolución) o NA-0001 (nota de anulación).
// Una anulación es la devolución de todo lo que quedaba de la factura. Ambas suman el stock, devuelven el dinero
// con el mismo método de pago (en efectivo sale de la caja abierta) o bajan la deuda si la venta fue a Fiado.
export const devolucionesDeVenta = (ventaId) => estado.devoluciones.filter((devolucion) => devolucion.ventaId === ventaId);
export const estaAnulada = (venta) => devolucionesDeVenta(venta.id).some((devolucion) => devolucion.tipo === 'anulacion');
export const totalDevuelto = (ventaId) => devolucionesDeVenta(ventaId).reduce((acumulado, devolucion) => acumulado + devolucion.total, 0);

const PREFIJO_NOTA = { devolucion: 'ND', anulacion: 'NA' };
export const ETIQUETA_NOTA = { devolucion: 'Nota de devolución', anulacion: 'Nota de anulación' };

// Productos de la venta con lo que aún se puede devolver
export function pendientesDeDevolver(venta) {
  const devoluciones = devolucionesDeVenta(venta.id);
  return venta.items.map((item) => {
    const devuelto = devoluciones.flatMap((devolucion) => devolucion.items)
      .filter((devuelta) => devuelta.productoId === item.productoId)
      .reduce((acumulado, devuelta) => acumulado + devuelta.cantidad, 0);
    return { ...item, disponibles: item.cantidad - devuelto };
  }).filter((item) => item.disponibles > 0);
}

function crearNota(venta, tipo, cantidades, motivo) {
  const motivoLimpio = exigirMotivo(motivo);
  if (estaAnulada(venta)) throw new Error(`La factura ${venta.id} ya está anulada`);
  const pendientes = pendientesDeDevolver(venta);
  if (!pendientes.length) throw new Error(`La factura ${venta.id} ya fue devuelta por completo`);

  const items = pendientes
    .map((item) => ({ productoId: item.productoId, nombre: item.nombre, referencia: item.referencia ?? '', cantidad: cantidades[item.productoId] ?? 0, valorUnitario: item.valorUnitario, disponibles: item.disponibles }))
    .filter((item) => item.cantidad > 0);
  if (!items.length) throw new Error('Escribe la cantidad que se devuelve de al menos un producto');
  const exceso = items.find((item) => !Number.isInteger(item.cantidad) || item.cantidad > item.disponibles);
  if (exceso) throw new Error(`De ${exceso.nombre} solo se pueden devolver ${exceso.disponibles} unidad(es)`);
  const total = items.reduce((acumulado, item) => acumulado + item.cantidad * item.valorUnitario, 0);

  if (venta.metodo === 'Fiado') {
    const cliente = buscarClientePorNombre(venta.cliente);
    if (cliente && total > deudaDeCliente(cliente)) {
      throw new Error(`${cliente.nombre} ya abonó parte de esta factura: la devolución supera su deuda actual. Registra el reembolso como egreso en Caja`);
    }
  } else if (venta.metodo === 'Efectivo' && !cajaAbierta()) {
    throw new Error('Abre la caja para devolver dinero en efectivo');
  }

  const nota = {
    id: siguienteCodigo(estado.devoluciones.filter((existente) => existente.tipo === tipo).map((existente) => existente.id), PREFIJO_NOTA[tipo], 4),
    ventaId: venta.id,
    fecha: new Date().toISOString(),
    tipo,
    motivo: motivoLimpio,
    usuario: nombreDeUsuario(),
    cliente: venta.cliente,
    metodo: venta.metodo,
    items: items.map(({ productoId, nombre, referencia, cantidad, valorUnitario }) => ({ productoId, nombre, referencia, cantidad, valorUnitario })),
    total,
  };
  estado.devoluciones.push(nota);
  moverStock(nota.items, -1);
  registrarAuditoria('ventas', tipo === 'anulacion' ? 'Factura anulada' : 'Devolución registrada', `${nota.id} sobre ${venta.id} · $ ${total} · ${motivoLimpio}`);
  guardarEstado();
  return nota;
}

const buscarVenta = (id) => {
  const venta = estado.ventas.find((candidata) => candidata.id === id);
  if (!venta) throw new Error('La factura no existe');
  return venta;
};

export function devolverProductos(ventaId, cantidades, motivo) {
  exigirPermiso('ventas', 'eliminar', 'registrar devoluciones');
  return crearNota(buscarVenta(ventaId), 'devolucion', cantidades, motivo);
}

// Solo se anula una factura del día o de días con la contabilidad abierta; si no, se registra una devolución
export function anularVenta(ventaId, motivo) {
  exigirPermiso('ventas', 'eliminar', 'anular facturas');
  const venta = buscarVenta(ventaId);
  if (aFechaLocal(venta.fecha) <= ultimoDiaCerrado()) {
    throw new Error('La contabilidad de ese día ya está cerrada: registra una devolución en lugar de anular');
  }
  const todo = Object.fromEntries(pendientesDeDevolver(venta).map((item) => [item.productoId, item.disponibles]));
  return crearNota(venta, 'anulacion', todo, motivo);
}
