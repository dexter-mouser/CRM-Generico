import { buscar } from '../../core/dom.js';
import { estado, guardarEstado } from '../../core/store.js';
import { aPesos } from '../../core/format.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { resumirItems } from '../../services/ventas.service.js';
import { habilitarReordenamiento } from '../../components/reordenar/reordenar.js';

const sumarVentas = (filtro) => estado.ventas.filter(filtro).reduce((acumulado, venta) => acumulado + venta.total, 0);
const calcularPorcentaje = (valor, meta) => Math.max(0, Math.min(100, Math.round((valor / meta) * 100)));

export async function dibujar() {
  const documento = await cargarHtml(new URL('./panel.html', import.meta.url));
  const metricas = [
    { etiqueta: 'Ventas del día', valor: sumarVentas(() => true), meta: 1500000, formato: 'pesos' },
    { etiqueta: 'Efectivo en caja', valor: sumarVentas((venta) => venta.metodo === 'Efectivo'), meta: 1000000, formato: 'pesos' },
    { etiqueta: 'Fiados pendientes', valor: sumarVentas((venta) => venta.metodo === 'Fiado'), meta: 500000, formato: 'pesos' },
    {
      etiqueta: 'Productos en negativo',
      valor: estado.productos.filter((producto) => producto.existencias < 0).length,
      meta: Math.max(estado.productos.length, 1),
      formato: 'numero',
    },
  ];
  const tarjetas = estado.orden.map((indice) => {
    const { etiqueta, valor, meta, formato } = metricas[indice];
    return { indice, etiqueta, valor, formato, porcentaje: calcularPorcentaje(valor, meta) };
  });
  const barras = [90, 120, 70, 150, 110, 170, 60].map((altura, posicion) => ({ altura, retraso: posicion * 60 }));
  const filas = estado.ventas.slice(-5).reverse().map((venta) => ({
    cliente: venta.cliente,
    productos: resumirItems(venta),
    metodo: venta.metodo,
    total: aPesos(venta.total),
  }));

  return seccion(documento, 'principal', {
    tarjetas: repetir(documento, 'tarjeta-resumen', tarjetas),
    barras: repetir(documento, 'barra', barras),
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
