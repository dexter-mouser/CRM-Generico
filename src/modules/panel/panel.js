import { buscar } from '../../core/dom.js';
import { estado, guardarEstado } from '../../core/store.js';
import { aPesos, fechaDeHoy } from '../../core/format.js';
import { sesionActual } from '../../core/sesion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { resumirItems } from '../../services/ventas.service.js';
import { cajaAbierta, efectivoEnCaja } from '../../services/caja.service.js';
import { clientesConDeuda, deudaDeCliente } from '../../services/clientes.service.js';
import { ventasEntre, ventasPorDia } from '../../services/reportes.service.js';
import { habilitarReordenamiento } from '../../components/reordenar/reordenar.js';

const ALTURA_MAXIMA_BARRA = 170;
const ALTURA_MINIMA_BARRA = 4;

const calcularPorcentaje = (valor, total) => (total > 0 ? Math.max(0, Math.min(100, Math.round((valor / total) * 100))) : 0);

function saludoSegunHora() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  return hora < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export async function dibujar() {
  const documento = await cargarHtml(new URL('./panel.html', import.meta.url));
  const hoy = fechaDeHoy();
  const ventasDeHoy = ventasEntre(hoy, hoy);
  const semana = ventasPorDia(7);
  const mayorDia = Math.max(...semana.map((dia) => dia.total), 0);
  const conDeuda = clientesConDeuda();
  const productosNegativos = estado.productos.filter((producto) => producto.existencias < 0).length;

  const metricas = [
    {
      etiqueta: 'Ventas del día',
      valor: ventasDeHoy.reduce((acumulado, venta) => acumulado + venta.total, 0),
      formato: 'pesos',
      detalle: `${ventasDeHoy.length} ${ventasDeHoy.length === 1 ? 'venta' : 'ventas'} hoy`,
    },
    {
      etiqueta: 'Efectivo en caja',
      valor: efectivoEnCaja(),
      formato: 'pesos',
      detalle: cajaAbierta() ? 'Caja abierta' : 'Caja cerrada',
    },
    {
      etiqueta: 'Fiados pendientes',
      valor: conDeuda.reduce((acumulado, cliente) => acumulado + deudaDeCliente(cliente), 0),
      formato: 'pesos',
      detalle: `${conDeuda.length} ${conDeuda.length === 1 ? 'cliente' : 'clientes'} con deuda`,
    },
    {
      etiqueta: 'Productos en negativo',
      valor: productosNegativos,
      formato: 'numero',
      detalle: `de ${estado.productos.length} productos`,
    },
  ];
  const porcentajes = [
    calcularPorcentaje(metricas[0].valor, mayorDia),
    cajaAbierta() ? 100 : 0,
    calcularPorcentaje(conDeuda.length, estado.clientes.length),
    calcularPorcentaje(productosNegativos, estado.productos.length),
  ];
  const tarjetas = estado.orden.map((indice) => ({ indice, ...metricas[indice], porcentaje: porcentajes[indice] }));

  const formatoDia = new Intl.DateTimeFormat('es-CO', { weekday: 'short' });
  const barras = semana.map((dia, posicion) => ({
    altura: mayorDia > 0 ? Math.max(ALTURA_MINIMA_BARRA, Math.round((dia.total / mayorDia) * ALTURA_MAXIMA_BARRA)) : ALTURA_MINIMA_BARRA,
    retraso: posicion * 60,
    titulo: `${formatoDia.format(dia.fecha)}: ${aPesos(dia.total)}`,
  }));
  const etiquetas = semana.map((dia) => ({ texto: formatoDia.format(dia.fecha).replace('.', '') }));
  const filas = estado.ventas.slice(-5).reverse().map((venta) => ({
    cliente: venta.cliente,
    productos: resumirItems(venta),
    metodo: venta.metodo,
    total: aPesos(venta.total),
  }));

  return seccion(documento, 'principal', {
    saludo: saludoSegunHora(),
    nombre: (sesionActual()?.nombre ?? '').split(' ')[0],
    tarjetas: repetir(documento, 'tarjeta-resumen', tarjetas),
    barras: repetir(documento, 'barra', barras),
    etiquetas: repetir(documento, 'etiqueta-barra', etiquetas),
    filas: repetir(documento, 'fila-venta', filas),
  });
}

export function montar(raiz, contexto) {
  habilitarReordenamiento(buscar('#contenedor-tarjetas', raiz), {
    selector: '.resumen',
    alCambiar: (orden) => {
      estado.orden = orden;
      guardarEstado();
      contexto.aviso('Orden de las tarjetas actualizado correctamente');
    },
  });
}
