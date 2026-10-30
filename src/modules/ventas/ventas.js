import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { buscar } from '../../core/dom.js';
import { puede } from '../../core/autorizacion.js';
import * as servicioVentas from '../../services/ventas.service.js';
import { mostrarReciboDeVenta, mostrarComprobanteDeDevolucion } from '../../components/recibo/comprobantes.js';

let documento;

function estadoDeVenta(venta) {
  if (servicioVentas.estaAnulada(venta)) return { texto: 'Anulada', clase: '' };
  if (servicioVentas.devolucionesDeVenta(venta.id).length) return { texto: 'Con devolución', clase: 'suave' };
  return { texto: 'Activa', clase: 'suave' };
}

export async function dibujar() {
  documento = await cargarHtml(new URL('./ventas.html', import.meta.url));
  const puedeDevolver = puede('ventas', 'eliminar');
  const filas = estado.ventas.slice().reverse().map((venta) => {
    const situacion = estadoDeVenta(venta);
    const pendiente = servicioVentas.pendientesDeDevolver(venta).length > 0;
    return {
      id: venta.id,
      fecha: aFecha(venta.fecha),
      cliente: venta.cliente,
      productos: servicioVentas.resumirItems(venta),
      metodo: venta.metodo,
      total: aPesos(venta.total),
      estado: situacion.texto,
      claseEstado: situacion.clase,
      acciones: puedeDevolver && pendiente && !servicioVentas.estaAnulada(venta) ? repetir(documento, 'acciones-venta', [{ id: venta.id }]) : '',
    };
  });
  const filasDevoluciones = estado.devoluciones.slice().reverse().map((devolucion) => ({
    id: devolucion.id,
    fecha: aFecha(devolucion.fecha),
    ventaId: devolucion.ventaId,
    tipo: devolucion.tipo === 'anulacion' ? 'Anulación' : 'Devolución',
    productos: devolucion.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', '),
    motivo: devolucion.motivo,
    usuario: devolucion.usuario,
    total: aPesos(devolucion.total),
  }));
  return seccion(documento, 'principal', {
    filas: repetir(documento, 'fila-venta', filas),
    filasDevoluciones: repetir(documento, 'fila-devolucion', filasDevoluciones),
    sinDevoluciones: filasDevoluciones.length ? '' : repetir(documento, 'aviso-vacio', [{ texto: 'Aún no hay devoluciones ni anulaciones.' }]),
  });
}

export function montar(raiz, contexto) {
  const zona = buscar('#zona-devolucion', raiz);

  // Abre el panel de devolución (con cantidades) o de anulación (todo lo pendiente) de una venta
  function abrirPanel(ventaId, esAnulacion) {
    const venta = estado.ventas.find((candidata) => candidata.id === ventaId);
    const pendientes = servicioVentas.pendientesDeDevolver(venta).map((item) => ({ ...item, valorUnitario: aPesos(item.valorUnitario) }));
    zona.innerHTML = seccion(documento, 'panel-devolucion', {
      titulo: esAnulacion ? `Anular la venta ${venta.id}` : `Devolver productos de la venta ${venta.id}`,
      descripcion: esAnulacion
        ? 'Se devuelve todo lo que queda de la venta: vuelve al stock y se reintegra el dinero. Solo se anulan ventas de días con la contabilidad abierta.'
        : 'Escribe cuántas unidades devuelve el cliente de cada producto.',
      columnaCantidad: esAnulacion ? 'Se devuelve' : 'Cantidad a devolver',
      filas: repetir(documento, esAnulacion ? 'fila-anular-item' : 'fila-devolver-item', pendientes),
      claseBoton: esAnulacion ? 'peligro' : 'primario',
      textoBoton: esAnulacion ? 'Anular venta' : 'Registrar devolución',
    });
    activarCamposNumericos(zona);
    zona.scrollIntoView({ block: 'nearest' });
    (buscar('[data-cantidad-producto]', zona) ?? buscar('#motivo-devolucion', zona)).focus();

    buscar('#cancelar-devolucion', zona).onclick = () => { zona.innerHTML = ''; };
    buscar('#confirmar-devolucion', zona).onclick = () => {
      try {
        const motivo = buscar('#motivo-devolucion', zona).value;
        let devolucion;
        if (esAnulacion) {
          devolucion = servicioVentas.anularVenta(ventaId, motivo);
        } else {
          const cantidades = {};
          zona.querySelectorAll('[data-cantidad-producto]').forEach((campo) => {
            cantidades[campo.dataset.cantidadProducto] = leerEntero(campo.value);
          });
          devolucion = servicioVentas.devolverProductos(ventaId, cantidades, motivo);
        }
        contexto.aviso(esAnulacion
          ? `Venta ${ventaId} anulada correctamente`
          : `Devolución ${devolucion.id} registrada correctamente`);
        contexto.redibujar();
        mostrarComprobanteDeDevolucion(devolucion);
      } catch (error) {
        contexto.alerta(error.message);
      }
    };
  }

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const recibo = evento.target.closest('[data-recibo]');
    if (recibo) return mostrarReciboDeVenta(estado.ventas.find((venta) => venta.id === recibo.dataset.recibo));
    const devolver = evento.target.closest('[data-devolver]');
    if (devolver) return abrirPanel(devolver.dataset.devolver, false);
    const anular = evento.target.closest('[data-anular]');
    if (anular) return abrirPanel(anular.dataset.anular, true);
    const comprobante = evento.target.closest('[data-comprobante]');
    if (comprobante) mostrarComprobanteDeDevolucion(estado.devoluciones.find((devolucion) => devolucion.id === comprobante.dataset.comprobante));
  });
}
