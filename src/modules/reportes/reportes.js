import { buscar, buscarTodos } from '../../core/dom.js';
import { aPesos, aFecha, fechaDeHoy, aFechaLocal } from '../../core/format.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { descargarCsv } from '../../services/csv.service.js';
import * as servicioReportes from '../../services/reportes.service.js';

let documento;

const primerDiaDelMes = () => `${fechaDeHoy().slice(0, 8)}01`;
const haceDias = (dias) => aFechaLocal(new Date(Date.now() - dias * 86400000).toISOString());

export async function dibujar() {
  documento = await cargarHtml(new URL('./reportes.html', import.meta.url));
  return seccion(documento, 'principal', { desde: primerDiaDelMes(), hasta: fechaDeHoy() });
}

export function montar(raiz, contexto) {
  const desde = buscar('#fecha-desde', raiz);
  const hasta = buscar('#fecha-hasta', raiz);
  let reporte;

  const pintar = () => {
    reporte = servicioReportes.reporteDeVentas(desde.value, hasta.value);
    buscar('#indicadores', raiz).innerHTML = repetir(documento, 'indicador', [
      { etiqueta: 'Total vendido', valor: aPesos(reporte.total) },
      { etiqueta: 'Ventas', valor: reporte.cantidad },
      { etiqueta: 'Ticket promedio', valor: aPesos(reporte.ticketPromedio) },
      { etiqueta: 'Utilidad estimada', valor: aPesos(reporte.utilidad) },
    ]);
    buscar('#por-metodo', raiz).innerHTML = repetir(documento, 'fila-metodo',
      reporte.porMetodo.map((fila) => ({ metodo: fila.metodo, valor: aPesos(fila.valor) })));
    buscar('#sin-ventas', raiz).hidden = reporte.cantidad > 0;
    buscar('#mas-vendidos', raiz).innerHTML = repetir(documento, 'fila-mas-vendido',
      reporte.masVendidos.map((fila) => ({ ...fila, total: aPesos(fila.total) })));

    const stockBajo = servicioReportes.productosConStockBajo();
    buscar('#stock-bajo', raiz).innerHTML = repetir(documento, 'fila-stock-bajo', stockBajo);
    buscar('#sin-stock-bajo', raiz).hidden = stockBajo.length > 0;

    const deudas = servicioReportes.deudasDeClientes();
    buscar('#deudas', raiz).innerHTML = repetir(documento, 'fila-deuda',
      deudas.map((fila) => ({ nombre: fila.nombre, deuda: aPesos(fila.deuda) })));
    buscar('#sin-deudas', raiz).hidden = deudas.length > 0;
  };

  const rangos = {
    hoy: () => [fechaDeHoy(), fechaDeHoy()],
    semana: () => [haceDias(6), fechaDeHoy()],
    mes: () => [primerDiaDelMes(), fechaDeHoy()],
  };
  buscarTodos('[data-rango]', raiz).forEach((boton) => {
    boton.onclick = () => {
      [desde.value, hasta.value] = rangos[boton.dataset.rango]();
      pintar();
    };
  });

  const alCambiarFechas = () => {
    if (!desde.value || !hasta.value) return;
    if (desde.value > hasta.value) return contexto.alerta('La fecha inicial no puede ser posterior a la final');
    pintar();
  };
  desde.onchange = alCambiarFechas;
  hasta.onchange = alCambiarFechas;

  buscar('#descargar-ventas', raiz).onclick = () => {
    if (!reporte.ventas.length) return contexto.alerta('No hay ventas en este rango para descargar');
    descargarCsv(
      `ventas-${desde.value}_${hasta.value}.csv`,
      ['N°', 'Fecha', 'Cliente', 'Pago', 'Productos', 'Total'],
      reporte.ventas.map((venta) => [
        venta.id, aFecha(venta.fecha), venta.cliente, venta.metodo,
        venta.items.map((item) => `${item.nombre} x${item.cantidad}`).join('; '), venta.total,
      ]),
    );
    contexto.aviso('Documento CSV descargado correctamente');
  };

  pintar();
}
