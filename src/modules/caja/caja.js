import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import * as servicioCaja from '../../services/caja.service.js';
import { tiendaActiva, nombreDeTienda } from '../../core/tienda.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { cargarPlantillasFicha, crearFicha } from '../../components/ficha-registro/ficha-registro.js';

let documento;
let plantillasCuadricula;
let plantillasFicha;

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
  });
};

export async function dibujar(contexto) {
  documento = await cargarHtml(new URL('./caja.html', import.meta.url));
  [plantillasCuadricula, plantillasFicha] = await Promise.all([cargarPlantillasCuadricula(), cargarPlantillasFicha()]);
  const caja = servicioCaja.cajaAbierta();
  const tienda = tiendaActiva();
  contexto.cabecera = { complemento: tienda?.nombre ?? 'Todas las tiendas' };
  return seccion(documento, 'principal', {
    contenido: !tienda ? seccion(documento, 'sin-tienda') : (caja ? contenidoCajaAbierta(caja) : seccion(documento, 'caja-cerrada')),
  });
}

export function montar(raiz, contexto) {
  montarCuadricula(buscar('#cuadricula-cierres', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Cierres anteriores',
    vacio: 'Aún no hay cierres de caja.',
    columnas: [
      { clave: 'id', titulo: 'Caja', ancho: '84px' },
      { clave: 'tienda', titulo: 'Tienda', ancho: '130px' },
      { clave: 'apertura', titulo: 'Apertura', ancho: 'minmax(0, 1fr)' },
      { clave: 'cierre', titulo: 'Cierre', ancho: 'minmax(0, 1fr)' },
      { clave: 'esperado', titulo: 'Esperado', ancho: '112px', alinear: 'derecha' },
      { clave: 'contado', titulo: 'Contado', ancho: '112px', alinear: 'derecha' },
      { clave: 'diferencia', titulo: 'Diferencia', ancho: '112px', alinear: 'derecha' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '90px', filtrable: false, html: (fila) => repetir(documento, 'accion-cierre', [{ id: fila.id }]) },
    ],
    filas: servicioCaja.cajasDeLaVista().filter((existente) => existente.cierre).reverse().map((existente) => ({
      id: existente.id,
      tienda: nombreDeTienda(existente.tiendaId ?? estado.tiendas[0]?.id),
      apertura: aFecha(existente.apertura),
      cierre: aFecha(existente.cierre.fecha),
      esperado: aPesos(existente.cierre.esperado),
      contado: aPesos(existente.cierre.contado),
      diferencia: aPesos(existente.cierre.diferencia),
    })),
  });

  // Ficha del cierre: resumen de la caja tal como quedó (no se edita)
  const resumenEnLineas = (resumen) => [
    ['Base', resumen.base],
    ['Ventas en efectivo', resumen.ventasEfectivo],
    ['Abonos de clientes en efectivo', resumen.abonosEfectivo],
    ['Ingresos', resumen.ingresos],
    ['Egresos', 0 - resumen.egresos],
    ['Pagos a proveedores en efectivo', 0 - resumen.pagosProveedores],
    ['Devoluciones en efectivo', 0 - resumen.reembolsos],
  ].map(([etiqueta, valor]) => ({ etiqueta, valor: aPesos(valor) }));
  const ficha = crearFicha(buscar('#ficha-cierre', raiz), plantillasFicha);
  const abrirFicha = (id) => ficha.abrir(id, () => {
    const cerrada = estado.cajas.find((candidata) => candidata.id === id);
    if (!cerrada?.cierre) return null;
    const resumen = servicioCaja.resumenDeCaja(cerrada);
    return {
      etiqueta: 'Ficha del cierre de caja',
      titulo: `Caja ${cerrada.id} · ${nombreDeTienda(cerrada.tiendaId ?? estado.tiendas[0]?.id)}`,
      subtitulo: `${aFecha(cerrada.apertura)} → ${aFecha(cerrada.cierre.fecha)}${cerrada.usuario ? ` · ${cerrada.usuario}` : ''}`,
      indicadores: [
        { etiqueta: 'Esperado', valor: aPesos(cerrada.cierre.esperado) },
        { etiqueta: 'Contado', valor: aPesos(cerrada.cierre.contado) },
        { etiqueta: 'Diferencia', valor: aPesos(cerrada.cierre.diferencia), clase: cerrada.cierre.diferencia < 0 ? 'texto-negativo' : '' },
      ],
      datos: resumenEnLineas(resumen),
      contenido: repetir(documento, 'contenido-ficha-cierre', [{}]),
      alMontar: (seccionFicha) => montarCuadricula(seccionFicha.querySelector('[data-movimientos]'), {
        plantillas: plantillasCuadricula,
        titulo: 'Movimientos',
        vacio: 'Sin ingresos ni egresos manuales.',
        columnas: [
          { clave: 'hora', titulo: 'Hora', ancho: '100px' }, { clave: 'tipo', titulo: 'Tipo', ancho: '110px' },
          { clave: 'concepto', titulo: 'Concepto', ancho: 'minmax(0, 1fr)' }, { clave: 'valor', titulo: 'Valor', ancho: '120px', alinear: 'derecha' },
        ],
        filas: resumen.movimientos.map((movimiento) => ({
          hora: aHora(movimiento.fecha), tipo: movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', concepto: movimiento.concepto, valor: aPesos(movimiento.valor),
        })),
      }),
    };
  });
  buscar('#cuadricula-cierres', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-ficha]');
    if (boton) abrirFicha(boton.dataset.ficha);
  });

  // Paneles de proceso de la caja abierta: registrar movimiento y cerrar caja
  const alternarPanel = (abrir, cerrar) => {
    const panel = buscar(abrir, raiz);
    buscar(cerrar, raiz).hidden = true;
    panel.hidden = false;
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    panel.querySelector('input, select')?.focus();
  };
  buscar('#nuevo-movimiento', raiz)?.addEventListener('click', () => alternarPanel('#panel-movimiento', '#panel-cierre'));
  buscar('#abrir-cierre', raiz)?.addEventListener('click', () => alternarPanel('#panel-cierre', '#panel-movimiento'));
  buscar('#cancelar-movimiento', raiz)?.addEventListener('click', () => { buscar('#panel-movimiento', raiz).hidden = true; });
  buscar('#cancelar-cierre', raiz)?.addEventListener('click', () => { buscar('#panel-cierre', raiz).hidden = true; });

  const caja = servicioCaja.cajaAbierta();
  const contenedorMovimientos = buscar('#cuadricula-movimientos', raiz);
  if (caja && contenedorMovimientos) {
    montarCuadricula(contenedorMovimientos, {
      plantillas: plantillasCuadricula,
      titulo: 'Movimientos de esta caja',
      vacio: 'Aún no hay ingresos ni egresos manuales.',
      columnas: [
        { clave: 'hora', titulo: 'Hora', ancho: '100px' },
        { clave: 'tipo', titulo: 'Tipo', ancho: '110px' },
        { clave: 'concepto', titulo: 'Concepto', ancho: 'minmax(0, 1fr)' },
        { clave: 'valor', titulo: 'Valor', ancho: '120px', alinear: 'derecha' },
      ],
      filas: servicioCaja.resumenDeCaja(caja).movimientos.slice().reverse().map((movimiento) => ({
        hora: aHora(movimiento.fecha),
        tipo: movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        concepto: movimiento.concepto,
        valor: aPesos(movimiento.valor),
      })),
    });
  }

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
