// Reportes: cálculos de solo lectura sobre ventas, inventario y deudas.
import { estado } from '../core/store.js';
import { aFechaLocal } from '../core/format.js';
import { clientesConDeuda, deudaDeCliente } from './clientes.service.js';

export const LIMITE_STOCK_BAJO = 5;

// Ventas cuya fecha local está entre "desde" y "hasta" (ambas incluidas, formato AAAA-MM-DD)
export const ventasEntre = (desde, hasta) =>
  estado.ventas.filter((venta) => {
    const dia = aFechaLocal(venta.fecha);
    return dia >= desde && dia <= hasta;
  });

// La utilidad usa el costo actual del producto, porque las ventas no guardan el costo del momento
export function reporteDeVentas(desde, hasta) {
  const ventas = ventasEntre(desde, hasta);
  const total = ventas.reduce((acumulado, venta) => acumulado + venta.total, 0);
  const costoDe = (productoId) => estado.productos.find((producto) => producto.id === productoId)?.costo ?? 0;

  const porMetodo = new Map();
  const porProducto = new Map();
  let utilidad = 0;
  for (const venta of ventas) {
    porMetodo.set(venta.metodo, (porMetodo.get(venta.metodo) ?? 0) + venta.total);
    for (const item of venta.items) {
      const ingreso = item.cantidad * item.valorUnitario;
      utilidad += ingreso - item.cantidad * costoDe(item.productoId);
      const anterior = porProducto.get(item.productoId) ?? { id: item.productoId, nombre: item.nombre, cantidad: 0, total: 0 };
      anterior.cantidad += item.cantidad;
      anterior.total += ingreso;
      porProducto.set(item.productoId, anterior);
    }
  }
  return {
    ventas,
    total,
    cantidad: ventas.length,
    ticketPromedio: ventas.length ? Math.round(total / ventas.length) : 0,
    utilidad,
    porMetodo: [...porMetodo].map(([metodo, valor]) => ({ metodo, valor })).sort((a, b) => b.valor - a.valor),
    masVendidos: [...porProducto.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
  };
}

export const productosConStockBajo = () =>
  estado.productos.filter((producto) => producto.existencias <= LIMITE_STOCK_BAJO)
    .sort((a, b) => a.existencias - b.existencias);

export const deudasDeClientes = () =>
  clientesConDeuda().map((cliente) => ({ nombre: cliente.nombre, deuda: deudaDeCliente(cliente) }))
    .sort((a, b) => b.deuda - a.deuda);

// Total vendido por cada uno de los últimos "dias" días, terminando hoy (para la gráfica del panel)
export function ventasPorDia(dias) {
  const resultado = [];
  for (let atras = dias - 1; atras >= 0; atras--) {
    const fecha = new Date(Date.now() - atras * 86400000);
    const dia = aFechaLocal(fecha.toISOString());
    const total = ventasEntre(dia, dia).reduce((acumulado, venta) => acumulado + venta.total, 0);
    resultado.push({ dia, fecha, total });
  }
  return resultado;
}
