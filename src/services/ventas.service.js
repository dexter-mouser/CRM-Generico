import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';

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
  const sinCantidad = lineas.find((linea) => !(linea.cantidad >= 1));
  if (sinCantidad) throw new Error(`La cantidad de ${sinCantidad.nombre} debe ser al menos 1`);
  const sinValor = lineas.find((linea) => !(linea.valorUnitario > 0));
  if (sinValor) throw new Error(`Escribe el valor unitario de ${sinValor.nombre}`);

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
    cliente: cliente.trim() || 'Cliente sin nombre',
    metodo,
    items,
    total: items.reduce((acumulado, item) => acumulado + item.cantidad * item.valorUnitario, 0),
  };
}

// Una venta puede tener varios productos; cada uno descuenta su cantidad del stock (puede quedar en negativo)
export function registrarVenta(datos) {
  const venta = { id: siguienteCodigo(estado.ventas.map((existente) => existente.id), 'V', 4), ...armarVenta(datos) };
  estado.ventas.push(venta);
  venta.items.forEach((item) => {
    const producto = estado.productos.find((candidato) => candidato.id === item.productoId);
    if (producto) producto.existencias -= item.cantidad;
  });
  guardarEstado();
  return venta;
}
