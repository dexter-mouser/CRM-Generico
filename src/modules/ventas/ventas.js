import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { buscar } from '../../core/dom.js';
import { resumirItems } from '../../services/ventas.service.js';
import { mostrarRecibo } from '../../components/recibo/recibo.js';

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

// Cada venta del historial puede abrir su recibo en la vista previa
export function montar(raiz) {
  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-recibo]');
    if (boton) mostrarRecibo(estado.ventas.find((venta) => venta.id === boton.dataset.recibo));
  });
}
