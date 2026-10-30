import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';
import { aFechaLocal } from '../core/format.js';
import { exigirPermiso, nombreDeUsuario } from '../core/autorizacion.js';
import { exigirMotivo, validarLineas } from '../core/validacion.js';
import { registrarAuditoria } from './auditoria.service.js';
import { ultimoDiaCerrado } from './contabilidad.service.js';
import { cajaAbierta } from './caja.service.js';
import { buscarCliente, deudaDeCliente } from './clientes.service.js';

export const resumirItems = (venta) => venta.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', ');

// El inventario guarda costo, no precio: se sugiere el valor de la última venta de ese producto
export function ultimoValorDeVenta(productoId) {
  for (let posicion = estado.ventas.length - 1; posicion >= 0; posicion--) {
    const item = estado.ventas[posicion].items.find((candidato) => candidato.productoId === productoId);
    if (item) return item.valorUnitario;
  }
  return 0;
}

// Valida las líneas y arma la venta sin guardarla: sirve para el recibo previo y para registrar
export function armarVenta({ cliente, metodo, lineas }) {
  if (!lineas.length) throw new Error('Agrega al menos un producto a la venta');
  validarLineas(lineas, 'valorUnitario', 'el valor unitario');

  if (!estado.ajustes.ventas.permitirSinExistencias) {
    for (const linea of lineas) {
      const producto = estado.productos.find((candidato) => candidato.id === linea.productoId);
      if (producto && linea.cantidad > producto.existencias) {
        throw new Error(`No hay existencias suficientes de ${linea.nombre} (disponibles: ${producto.existencias})`);
      }
    }
  }

  const nombreCliente = cliente.trim();
  const registrado = estado.clientes.some((existente) => existente.nombre.trim().toLowerCase() === nombreCliente.toLowerCase());
  if (metodo === 'Fiado' && !registrado) {
    throw new Error('Para vender a Fiado, registra primero al cliente en Clientes y escribe su nombre completo');
  }

  const items = lineas.map(({ productoId, nombre, cantidad, valorUnitario }) => ({ productoId, nombre, cantidad, valorUnitario }));
  return {
    fecha: new Date().toISOString(),
    cliente: cliente.trim().slice(0, 120) || 'Cliente sin nombre',
    metodo,
    usuario: nombreDeUsuario(),
    items,
    total: items.reduce((acumulado, item) => acumulado + item.cantidad * item.valorUnitario, 0),
  };
}

// Una venta puede tener varios productos; cada uno descuenta su cantidad del stock (puede quedar en negativo)
export function registrarVenta(datos) {
  exigirPermiso('nueva-venta', 'crear', 'registrar ventas');
  const venta = { id: siguienteCodigo(estado.ventas.map((existente) => existente.id), 'V', 4), ...armarVenta(datos) };
  estado.ventas.push(venta);
  venta.items.forEach((item) => {
    const producto = estado.productos.find((candidato) => candidato.id === item.productoId);
    if (producto) producto.existencias -= item.cantidad;
  });
  registrarAuditoria('ventas', 'Venta registrada', `${venta.id} · ${venta.cliente} · ${venta.metodo} · $ ${venta.total}`);
  guardarEstado();
  return venta;
}

// --- Devoluciones y anulaciones -------------------------------------------------------------------------
// Una anulación es la devolución de todo lo que quedaba de la venta. Ambas suman el stock, devuelven el dinero
// con el mismo método de pago (en efectivo sale de la caja abierta) o bajan la deuda si la venta fue a Fiado.
export const devolucionesDeVenta = (ventaId) => estado.devoluciones.filter((devolucion) => devolucion.ventaId === ventaId);
export const estaAnulada = (venta) => devolucionesDeVenta(venta.id).some((devolucion) => devolucion.tipo === 'anulacion');

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

function crearDevolucion(venta, tipo, cantidades, motivo) {
  const motivoLimpio = exigirMotivo(motivo);
  if (estaAnulada(venta)) throw new Error(`La venta ${venta.id} ya está anulada`);
  const pendientes = pendientesDeDevolver(venta);
  if (!pendientes.length) throw new Error(`La venta ${venta.id} ya fue devuelta por completo`);

  const items = pendientes
    .map((item) => ({ productoId: item.productoId, nombre: item.nombre, cantidad: cantidades[item.productoId] ?? 0, valorUnitario: item.valorUnitario, disponibles: item.disponibles }))
    .filter((item) => item.cantidad > 0);
  if (!items.length) throw new Error('Escribe la cantidad que se devuelve de al menos un producto');
  const exceso = items.find((item) => !Number.isInteger(item.cantidad) || item.cantidad > item.disponibles);
  if (exceso) throw new Error(`De ${exceso.nombre} solo se pueden devolver ${exceso.disponibles} unidad(es)`);
  const total = items.reduce((acumulado, item) => acumulado + item.cantidad * item.valorUnitario, 0);

  if (venta.metodo === 'Fiado') {
    const cliente = estado.clientes.find((candidato) => candidato.nombre.trim().toLowerCase() === venta.cliente.trim().toLowerCase());
    if (cliente && total > deudaDeCliente(cliente)) {
      throw new Error(`${cliente.nombre} ya abonó parte de esta venta: la devolución supera su deuda actual. Registra el reembolso como egreso en Caja`);
    }
  } else if (venta.metodo === 'Efectivo' && !cajaAbierta()) {
    throw new Error('Abre la caja para devolver dinero en efectivo');
  }

  const devolucion = {
    id: siguienteCodigo(estado.devoluciones.map((existente) => existente.id), 'D', 4),
    ventaId: venta.id,
    fecha: new Date().toISOString(),
    tipo,
    motivo: motivoLimpio,
    usuario: nombreDeUsuario(),
    cliente: venta.cliente,
    metodo: venta.metodo,
    items: items.map(({ productoId, nombre, cantidad, valorUnitario }) => ({ productoId, nombre, cantidad, valorUnitario })),
    total,
  };
  estado.devoluciones.push(devolucion);
  devolucion.items.forEach((item) => {
    const producto = estado.productos.find((candidato) => candidato.id === item.productoId);
    if (producto) producto.existencias += item.cantidad;
  });
  registrarAuditoria('ventas', tipo === 'anulacion' ? 'Venta anulada' : 'Devolución registrada', `${devolucion.id} sobre ${venta.id} · $ ${total} · ${motivoLimpio}`);
  guardarEstado();
  return devolucion;
}

const buscarVenta = (id) => {
  const venta = estado.ventas.find((candidata) => candidata.id === id);
  if (!venta) throw new Error('La venta no existe');
  return venta;
};

export function devolverProductos(ventaId, cantidades, motivo) {
  exigirPermiso('ventas', 'eliminar', 'registrar devoluciones');
  return crearDevolucion(buscarVenta(ventaId), 'devolucion', cantidades, motivo);
}

// Solo se anula una venta del día o de días con la contabilidad abierta; si no, se registra una devolución
export function anularVenta(ventaId, motivo) {
  exigirPermiso('ventas', 'eliminar', 'anular ventas');
  const venta = buscarVenta(ventaId);
  if (aFechaLocal(venta.fecha) <= ultimoDiaCerrado()) {
    throw new Error('La contabilidad de ese día ya está cerrada: registra una devolución en lugar de anular');
  }
  const todo = Object.fromEntries(pendientesDeDevolver(venta).map((item) => [item.productoId, item.disponibles]));
  return crearDevolucion(venta, 'anulacion', todo, motivo);
}
