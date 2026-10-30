// Recibo de venta: se muestra en una ventana de vista previa antes de imprimir.
// Sirve para una venta ya registrada (con número) y para una venta aún sin registrar (vista previa).
import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { cargarHtml, rellenar, repetir } from '../../core/template.js';

let plantillas;
let dialogo;

async function prepararDialogo() {
  if (dialogo) return;
  plantillas = await cargarHtml(new URL('./recibo.html', import.meta.url));
  document.body.insertAdjacentHTML('beforeend', plantillas.querySelector('dialog').outerHTML);
  dialogo = buscar('#recibo');
  buscar('#cerrar-recibo', dialogo).onclick = () => dialogo.close();
  buscar('#imprimir-recibo', dialogo).onclick = () => window.print();
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close(); // clic en el fondo oscuro
  });
  // Al imprimir con el recibo abierto, el CSS oculta la aplicación y deja solo el recibo
  addEventListener('beforeprint', () => {
    if (dialogo.open) document.body.classList.add('imprimiendo-recibo');
  });
  addEventListener('afterprint', () => document.body.classList.remove('imprimiendo-recibo'));
}

// Líneas con los datos de la tienda que se muestran bajo el nombre; las vacías no se muestran
function datosDeLaTienda() {
  const { tienda, recibo } = estado.ajustes;
  if (!recibo.mostrarDatosTienda) return [];
  const lugar = [tienda.direccion, tienda.ciudad].filter(Boolean).join(', ');
  return [
    tienda.nit && `NIT ${tienda.nit}`,
    lugar,
    tienda.telefono && `Tel. ${tienda.telefono}`,
  ].filter(Boolean);
}

export async function mostrarRecibo(venta) {
  await prepararDialogo();
  const lineas = venta.items.map((item) => ({
    nombre: item.nombre,
    cantidad: item.cantidad,
    valorUnitario: aPesos(item.valorUnitario),
    subtotal: aPesos(item.cantidad * item.valorUnitario),
  }));
  buscar('#contenido-recibo', dialogo).innerHTML = rellenar(plantillas.querySelector('#recibo-cuerpo').innerHTML, {
    tienda: estado.ajustes.tienda.nombre,
    datosTienda: repetir(plantillas, 'recibo-dato-tienda', datosDeLaTienda().map((texto) => ({ texto }))),
    pie: estado.ajustes.recibo.pie,
    titulo: venta.id ? 'Recibo de venta' : 'Vista previa del recibo',
    subtitulo: venta.id ? `N° ${venta.id}` : 'Venta sin registrar',
    fecha: aFecha(venta.fecha),
    cliente: venta.cliente,
    metodo: venta.metodo,
    lineas: repetir(plantillas, 'recibo-linea', lineas),
    total: aPesos(venta.total),
  });
  dialogo.showModal();
  buscar('#imprimir-recibo', dialogo).focus();
}
