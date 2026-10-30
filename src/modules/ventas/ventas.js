import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { resumirItems } from '../../services/ventas.service.js';

export async function dibujar() {
  const documento = await cargarHtml(new URL('./ventas.html', import.meta.url));
  const filas = estado.ventas.slice().reverse().map((venta) => ({
    id: venta.id,
    fecha: aFecha(venta.fecha),
    cliente: venta.cliente,
    productos: resumirItems(venta),
    metodo: venta.metodo,
    total: aPesos(venta.total),
  }));
  return seccion(documento, 'principal', { filas: repetir(documento, 'fila-venta', filas) });
}
