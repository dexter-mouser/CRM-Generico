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

// Una venta puede tener varios productos; cada uno descuenta su cantidad del stock (puede quedar en negativo)
export function registrarVenta({ cliente, metodo, lineas }) {
  if (!lineas.length) throw new Error('Agrega al menos un producto a la venta');
  const sinCantidad = lineas.find((linea) => !(linea.cantidad >= 1));
  if (sinCantidad) throw new Error(`La cantidad de ${sinCantidad.nombre} debe ser al menos 1`);
  const sinValor = lineas.find((linea) => !(linea.valorUnitario > 0));
  if (sinValor) throw new Error(`Escribe el valor unitario de ${sinValor.nombre}`);

  const items = lineas.map(({ productoId, nombre, cantidad, valorUnitario }) => ({ productoId, nombre, cantidad, valorUnitario }));
  const venta = {
    id: siguienteCodigo(estado.ventas.map((existente) => existente.id), 'V', 4),
    fecha: new Date().toISOString(),
    cliente: cliente.trim() || 'Cliente sin nombre',
    metodo,
    items,
    total: items.reduce((acumulado, item) => acumulado + item.cantidad * item.valorUnitario, 0),
  };
  estado.ventas.push(venta);
  items.forEach((item) => {
    const producto = estado.productos.find((candidato) => candidato.id === item.productoId);
    if (producto) producto.existencias -= item.cantidad;
  });
  guardarEstado();
  return venta;
}
