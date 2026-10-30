import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import * as servicioCaja from '../../services/caja.service.js';

let documento;

// Mensaje que se muestra solo cuando una lista no tiene elementos
const avisoVacio = (lista, texto) => (lista.length ? '' : repetir(documento, 'aviso-vacio', [{ texto }]));

const aHora = (iso) => new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' }).format(new Date(iso));

const contenidoCajaAbierta = (caja) => {
  const resumen = servicioCaja.resumenDeCaja(caja);
  const lineas = [
    ['Base', resumen.base],
    ['Ventas en efectivo', resumen.ventasEfectivo],
    ['Abonos de clientes en efectivo', resumen.abonosEfectivo],
    ['Ingresos', resumen.ingresos],
    ['Egresos', 0 - resumen.egresos],
    ['Pagos a proveedores en efectivo', 0 - resumen.pagosProveedores],
    ['Devoluciones en efectivo', 0 - resumen.reembolsos],
  ].map(([etiqueta, valor]) => ({ etiqueta, valor: aPesos(valor) }));
  return seccion(documento, 'caja-abierta', {
    apertura: aFecha(caja.apertura),
    lineas: repetir(documento, 'linea-resumen', lineas),
    esperado: aPesos(resumen.esperado),
    movimientos: repetir(documento, 'fila-movimiento', resumen.movimientos.slice().reverse().map((movimiento) => ({
      hora: aHora(movimiento.fecha),
      tipo: movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      concepto: movimiento.concepto,
      valor: aPesos(movimiento.valor),
    }))),
    sinMovimientos: avisoVacio(resumen.movimientos, 'Aún no hay ingresos ni egresos manuales.'),
  });
};

export async function dibujar() {
  documento = await cargarHtml(new URL('./caja.html', import.meta.url));
  const caja = servicioCaja.cajaAbierta();
  const cierres = estado.cajas.filter((existente) => existente.cierre).reverse().map((existente) => ({
    id: existente.id,
    apertura: aFecha(existente.apertura),
    cierre: aFecha(existente.cierre.fecha),
    esperado: aPesos(existente.cierre.esperado),
    contado: aPesos(existente.cierre.contado),
    diferencia: aPesos(existente.cierre.diferencia),
  }));
  return seccion(documento, 'principal', {
    contenido: caja ? contenidoCajaAbierta(caja) : seccion(documento, 'caja-cerrada'),
    cierres: repetir(documento, 'fila-cierre', cierres),
    sinCierres: avisoVacio(cierres, 'Aún no hay cierres de caja.'),
  });
}

export function montar(raiz, contexto) {
  const ejecutar = (accion, mensaje) => {
    try {
      const resultado = accion();
      contexto.aviso(typeof mensaje === 'function' ? mensaje(resultado) : mensaje);
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };
  const valorDe = (selector) => buscar(selector, raiz).value;

  buscar('#abrir-caja', raiz)?.addEventListener('click', () => {
    if (!valorDe('#base-caja').trim()) return contexto.alerta('Escribe la base con la que abres la caja (puede ser 0)');
    ejecutar(() => servicioCaja.abrirCaja(leerEntero(valorDe('#base-caja'))), 'Caja abierta correctamente');
  });

  buscar('#registrar-movimiento', raiz)?.addEventListener('click', () => {
    ejecutar(() => servicioCaja.registrarMovimiento({
      tipo: valorDe('#movimiento-tipo'),
      concepto: valorDe('#movimiento-concepto'),
      valor: leerEntero(valorDe('#movimiento-valor')),
    }), 'Movimiento registrado correctamente');
  });

  buscar('#cerrar-caja', raiz)?.addEventListener('click', () => {
    if (!valorDe('#efectivo-contado').trim()) return contexto.alerta('Escribe el efectivo que contaste (puede ser 0)');
    ejecutar(() => servicioCaja.cerrarCaja(leerEntero(valorDe('#efectivo-contado'))), (cierre) => {
      const diferencia = cierre.diferencia;
      const detalle = diferencia === 0 ? 'sin diferencia' : `diferencia de ${aPesos(diferencia)}`;
      return `Caja cerrada correctamente: ${detalle}`;
    });
  });
}
