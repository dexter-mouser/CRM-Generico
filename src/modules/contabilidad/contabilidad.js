import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { puede } from '../../core/autorizacion.js';
import { aPesos, aFecha } from '../../core/format.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import * as servicioContabilidad from '../../services/contabilidad.service.js';

let documento;

const avisoVacio = (lista, texto) => (lista.length ? '' : repetir(documento, 'aviso-vacio', [{ texto }]));

const lineasDeResumen = (resumen) => repetir(documento, 'linea-resumen', [
  ['Ventas registradas', resumen.cantidadVentas],
  ['Total vendido', aPesos(resumen.totalVentas)],
  ['Devoluciones y anulaciones', aPesos(resumen.devoluciones)],
  ['Costo de lo vendido', aPesos(resumen.costoVendido)],
  ['Utilidad estimada', aPesos(resumen.utilidad)],
  ['Ventas a Fiado', aPesos(resumen.ventasFiado)],
  ['Abonos de clientes', aPesos(resumen.abonosClientes)],
  ['Pagos a proveedores', aPesos(resumen.pagosProveedores)],
  ['Compras facturadas', aPesos(resumen.comprasFacturadas)],
  ['Ingresos de caja', aPesos(resumen.ingresosCaja)],
  ['Egresos de caja', aPesos(resumen.egresosCaja)],
  ['Diferencia de caja', aPesos(resumen.diferenciaCaja)],
].map(([etiqueta, valor]) => ({ etiqueta, valor })));

function contenidoPendiente() {
  const pendientes = servicioContabilidad.diasPendientes();
  if (!pendientes.length) {
    const ultimo = servicioContabilidad.ultimoDiaCerrado();
    return seccion(documento, 'al-dia', {
      detalle: ultimo ? `El último día cerrado fue ${aFecha(ultimo)}.` : 'Aún no hay días con movimientos para cerrar.',
    });
  }
  const dia = pendientes[0];
  return seccion(documento, 'dia-pendiente', {
    dia: aFecha(dia),
    pendientes: pendientes.length === 1 ? 'Es el único día pendiente.' : `Hay ${pendientes.length} días pendientes; se cierran del más antiguo al más reciente.`,
    lineas: lineasDeResumen(servicioContabilidad.resumenDelDia(dia)),
    cerrarTodos: pendientes.length > 1 ? repetir(documento, 'boton-cerrar-todos', [{ cantidad: pendientes.length }]) : '',
  });
}

function contenidoReabrir() {
  const ultimo = servicioContabilidad.ultimoDiaCerrado();
  if (!ultimo || !puede('contabilidad', 'reabrir')) return '';
  return seccion(documento, 'reabrir-dia', { dia: aFecha(ultimo) });
}

export async function dibujar() {
  documento = await cargarHtml(new URL('./contabilidad.html', import.meta.url));
  const cierres = estado.contabilidad.slice().sort((a, b) => b.dia.localeCompare(a.dia)).map((cierre) => ({
    dia: aFecha(cierre.dia),
    cantidad: cierre.cantidadVentas,
    total: aPesos(cierre.totalVentas),
    devoluciones: aPesos(cierre.devoluciones ?? 0),
    costo: aPesos(cierre.costoVendido),
    utilidad: aPesos(cierre.utilidad),
    fiado: aPesos(cierre.ventasFiado),
    abonos: aPesos(cierre.abonosClientes),
    pagos: aPesos(cierre.pagosProveedores),
    compras: aPesos(cierre.comprasFacturadas),
    diferencia: aPesos(cierre.diferenciaCaja),
  }));
  return seccion(documento, 'principal', {
    contenido: contenidoPendiente(),
    reabrir: contenidoReabrir(),
    cierres: repetir(documento, 'fila-cierre-dia', cierres),
    sinCierres: avisoVacio(cierres, 'Aún no hay días cerrados.'),
  });
}

export function montar(raiz, contexto) {
  const botonReabrir = buscar('#reabrir-dia-boton', raiz);
  if (botonReabrir) {
    botonReabrir.onclick = () => {
      try {
        const dia = servicioContabilidad.reabrirUltimoDia(buscar('#motivo-reabrir', raiz).value);
        contexto.aviso(`Contabilidad del ${aFecha(dia)} reabierta correctamente`);
        contexto.redibujar();
      } catch (error) {
        contexto.alerta(error.message);
      }
    };
  }

  const confirmacion = buscar('#confirmar-cierre', raiz);
  if (!confirmacion) return;
  let accionPendiente = null;

  const pedirConfirmacion = (texto, accion) => {
    accionPendiente = accion;
    buscar('#texto-cierre', raiz).textContent = texto;
    confirmacion.hidden = false;
    buscar('#confirmar-cierre-no', raiz).focus();
  };

  const pendientes = servicioContabilidad.diasPendientes();
  buscar('#cerrar-dia', raiz).onclick = () => pedirConfirmacion(
    `Al cerrar el ${aFecha(pendientes[0])}, su resumen queda guardado y no cambia. ¿Cerrarlo?`,
    () => {
      servicioContabilidad.cerrarDia(pendientes[0]);
      return `Contabilidad del ${aFecha(pendientes[0])} cerrada correctamente`;
    },
  );

  const cerrarTodos = buscar('#cerrar-todos', raiz);
  if (cerrarTodos) {
    cerrarTodos.onclick = () => pedirConfirmacion(
      `Se cerrarán ${pendientes.length} días en orden, y el resumen de cada uno queda guardado. ¿Continuar?`,
      () => `${servicioContabilidad.cerrarDiasPendientes()} días cerrados correctamente`,
    );
  }

  buscar('#confirmar-cierre-no', raiz).onclick = () => { confirmacion.hidden = true; };
  buscar('#confirmar-cierre-si', raiz).onclick = () => {
    try {
      contexto.aviso(accionPendiente());
      contexto.redibujar();
    } catch (error) {
      confirmacion.hidden = true;
      contexto.alerta(error.message);
    }
  };
}
