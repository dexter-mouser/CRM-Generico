// Arma los datos de cada comprobante imprimible a partir de los registros de la aplicación.
import { aPesos, aFecha } from '../../core/format.js';
import { mostrarComprobante } from './recibo.js';
import { devolucionesDeVenta, estaAnulada } from '../../services/ventas.service.js';
import { buscarCliente, deudaDeCliente } from '../../services/clientes.service.js';
import { proveedoresConSaldo } from '../../services/pagos.service.js';

const lineasDe = (items, campoValor) => items.map((item) => ({
  nombre: item.nombre,
  detalle: `${item.cantidad} × ${aPesos(item[campoValor])}`,
  valor: aPesos(item.cantidad * item[campoValor]),
}));
const unidades = (items) => items.reduce((acumulado, item) => acumulado + item.cantidad, 0);

// Una venta registrada (con número) o aún sin registrar (vista previa)
export function mostrarReciboDeVenta(venta) {
  const registrada = Boolean(venta.id);
  const devoluciones = registrada ? devolucionesDeVenta(venta.id) : [];
  const devuelto = devoluciones.reduce((acumulado, devolucion) => acumulado + devolucion.total, 0);
  const datos = [['Fecha', aFecha(venta.fecha)], ['Cliente', venta.cliente], ['Pago', venta.metodo], ['Unidades', unidades(venta.items)]];
  if (venta.usuario) datos.push(['Atendió', venta.usuario]);

  const totales = [{ etiqueta: 'TOTAL', valor: aPesos(venta.total), fuerte: !devuelto }];
  if (devuelto) {
    totales.push({ etiqueta: 'Devuelto', valor: `- ${aPesos(devuelto)}` });
    totales.push({ etiqueta: 'TOTAL NETO', valor: aPesos(venta.total - devuelto), fuerte: true });
  }
  const notas = devoluciones.map((devolucion) => `${devolucion.tipo === 'anulacion' ? 'Anulada' : 'Devolución'} ${devolucion.id} (${aFecha(devolucion.fecha)}): ${devolucion.motivo}`);
  return mostrarComprobante({
    titulo: registrada ? 'Recibo de venta' : 'Vista previa del recibo',
    subtitulo: registrada ? `N° ${venta.id}` : 'Venta sin registrar',
    datos,
    lineas: lineasDe(venta.items, 'valorUnitario'),
    totales,
    sello: registrada && estaAnulada(venta) ? 'ANULADA' : '',
    notas,
  });
}

export function mostrarComprobanteDeDevolucion(devolucion) {
  const reembolso = devolucion.metodo === 'Fiado' ? 'Se descontó de la deuda del cliente' : `Reembolso por ${devolucion.metodo}`;
  return mostrarComprobante({
    titulo: devolucion.tipo === 'anulacion' ? 'Comprobante de anulación' : 'Comprobante de devolución',
    subtitulo: `N° ${devolucion.id} · venta ${devolucion.ventaId}`,
    datos: [['Fecha', aFecha(devolucion.fecha)], ['Cliente', devolucion.cliente], ['Unidades', unidades(devolucion.items)], ['Registró', devolucion.usuario]],
    lineas: lineasDe(devolucion.items, 'valorUnitario'),
    totales: [{ etiqueta: 'TOTAL DEVUELTO', valor: aPesos(devolucion.total), fuerte: true }],
    notas: [`Motivo: ${devolucion.motivo}`, reembolso],
    firmas: ['Cliente', 'Tienda'],
  });
}

export function mostrarComprobanteDePago(pago) {
  const esAbono = pago.tipo === 'abono';
  let saldo;
  if (esAbono) {
    const cliente = buscarCliente(pago.terceroId);
    saldo = cliente ? deudaDeCliente(cliente) : 0;
  } else {
    saldo = proveedoresConSaldo().find((proveedor) => proveedor.nombre.toLowerCase() === pago.tercero.toLowerCase())?.pendiente ?? 0;
  }
  return mostrarComprobante({
    titulo: esAbono ? 'Recibo de abono' : 'Comprobante de pago a proveedor',
    subtitulo: `N° ${pago.id}`,
    datos: [['Fecha', aFecha(pago.fecha)], [esAbono ? 'Cliente' : 'Proveedor', pago.tercero], ['Concepto', pago.concepto], ['Método', pago.metodo]],
    totales: [
      { etiqueta: esAbono ? 'VALOR ABONADO' : 'VALOR PAGADO', valor: aPesos(pago.valor), fuerte: true },
      { etiqueta: esAbono ? 'Deuda actual' : 'Saldo pendiente', valor: aPesos(saldo) },
    ],
    firmas: esAbono ? ['Recibí conforme', 'Cliente'] : ['Recibí conforme', 'Proveedor'],
  });
}

export function mostrarComprobanteDeFactura(factura) {
  const datos = [['Proveedor', factura.proveedor], ['N° de factura', factura.numero], ['Fecha', aFecha(factura.fecha)], ['Unidades', unidades(factura.items)]];
  if (factura.usuario) datos.push(['Registró', factura.usuario]);
  return mostrarComprobante({
    titulo: 'Factura de compra',
    subtitulo: `${factura.proveedor} · ${factura.numero}`,
    datos,
    lineas: lineasDe(factura.items, 'costoUnitario'),
    totales: [{ etiqueta: 'TOTAL FACTURA', valor: aPesos(factura.total), fuerte: true }],
    notas: ['Las cantidades se sumaron al inventario.'],
  });
}
