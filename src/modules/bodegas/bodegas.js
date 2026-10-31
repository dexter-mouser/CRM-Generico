import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { puede } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { nombreDeTienda } from '../../core/tienda.js';
import { bodegaActiva, buscarBodega, existenciasEn } from '../../services/inventario.service.js';
import * as servicioBodegas from '../../services/bodegas.service.js';
import { dibujarSelector, montarSelectorProductos } from '../../components/selector-productos/selector-productos.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';

const CAMPOS = ['nombre', 'tiendaId', 'direccion'];
let documento;
let plantillasCuadricula;

const porRecibirEn = (bodegaId) => estado.traslados.filter((traslado) => traslado.estado === 'enviado' && traslado.destinoId === bodegaId).length;

export async function dibujar() {
  documento = await cargarHtml(new URL('./bodegas.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  const editar = puede('bodegas', 'editar');
  const fichas = estado.bodegas.map((bodega) => {
    const resumen = servicioBodegas.resumenDeBodega(bodega.id);
    return {
      ...bodega,
      tienda: bodega.tiendaId ? nombreDeTienda(bodega.tiendaId) : 'Bodega central',
      clase: bodega.activa ? '' : 'inactiva',
      estadoTexto: bodega.activa ? 'Activa' : 'Inactiva',
      unidades: resumen.unidades,
      valor: aPesos(resumen.valor),
      productos: resumen.productos,
      porRecibir: porRecibirEn(bodega.id),
      acciones: editar ? repetir(documento, 'acciones-bodega', [{ id: bodega.id, textoEstado: bodega.activa ? 'Desactivar' : 'Activar' }]) : '',
    };
  });
  const activas = servicioBodegas.bodegasActivas();
  return seccion(documento, 'principal', {
    fichas: repetir(documento, 'ficha-bodega', fichas),
    opcionesTienda: repetir(documento, 'opcion', [{ valor: '', texto: 'Ninguna (bodega central)' }, ...estado.tiendas.map((tienda) => ({ valor: tienda.id, texto: tienda.nombre }))]),
    opcionesBodega: repetir(documento, 'opcion', activas.map((bodega) => ({ valor: bodega.id, texto: `${bodega.nombre} · ${bodega.id}` }))),
    selector: await dibujarSelector(),
  });
}

export function montar(raiz, contexto) {
  const campo = (nombre) => buscar(`#bodega-${nombre}`, raiz);
  const formulario = buscar('#formulario-bodega', raiz);
  const panelTraslado = buscar('#panel-traslado', raiz);
  let enEdicion = null;
  let trasladoPorAnular = null;
  buscar('#nueva-bodega', raiz).hidden = !puede('bodegas', 'crear');
  buscar('#nuevo-traslado', raiz).hidden = !puede('bodegas', 'crear');

  const ejecutar = (accion, mensaje) => {
    try {
      const resultado = accion();
      contexto.aviso(mensaje);
      return resultado ?? true;
    } catch (error) {
      contexto.alerta(error.message);
      return false;
    }
  };

  // --- Bodegas ---------------------------------------------------------------------------------------------
  const abrirFormulario = (bodega) => {
    enEdicion = bodega?.id ?? null;
    buscar('#titulo-formulario-bodega', raiz).textContent = bodega ? `Editar ${bodega.nombre}` : 'Nueva bodega';
    CAMPOS.forEach((nombre) => { campo(nombre).value = bodega?.[nombre] ?? ''; });
    formulario.hidden = false;
    campo('nombre').focus();
  };
  buscar('#nueva-bodega', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-bodega', raiz).onclick = () => { formulario.hidden = true; };
  buscar('#guardar-bodega', raiz).onclick = () => {
    const datos = Object.fromEntries(CAMPOS.map((nombre) => [nombre, campo(nombre).value]));
    const aplicado = enEdicion
      ? ejecutar(() => servicioBodegas.actualizarBodega(enEdicion, datos), 'Bodega actualizada correctamente')
      : ejecutar(() => servicioBodegas.agregarBodega(datos), 'Bodega creada correctamente');
    if (aplicado) contexto.redibujar();
  };
  buscar('#fichas-bodegas', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    const bodega = buscarBodega(boton.dataset.editar ?? boton.dataset.estado);
    if (!bodega) return;
    if (boton.dataset.editar) return abrirFormulario(bodega);
    const mensaje = `${bodega.nombre} ${bodega.activa ? 'desactivada' : 'activada'} correctamente`;
    if (ejecutar(() => servicioBodegas.cambiarEstadoBodega(bodega.id, !bodega.activa), mensaje)) contexto.redibujar();
  });

  // --- Matriz de stock: una columna por bodega activa -------------------------------------------------------
  const activas = servicioBodegas.bodegasActivas();
  montarCuadricula(buscar('#cuadricula-stock', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Stock por bodega',
    vacio: 'Aún no hay productos.',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '70px' },
      { clave: 'nombre', titulo: 'Producto', ancho: 'minmax(160px, 1.4fr)' },
      ...activas.map((bodega) => ({ clave: bodega.id, titulo: bodega.nombre, ancho: 'minmax(90px, 1fr)', alinear: 'derecha' })),
      { clave: 'total', titulo: 'Total', ancho: '84px', alinear: 'derecha' },
    ],
    filas: estado.productos.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      ...Object.fromEntries(activas.map((bodega) => [bodega.id, existenciasEn(producto, bodega.id)])),
      total: producto.existencias,
    })),
  });

  // --- Nuevo traslado --------------------------------------------------------------------------------------
  const lineas = [];
  const cuerpo = buscar('#lineas-traslado', raiz);
  const origen = buscar('#traslado-origen', raiz);
  const destino = buscar('#traslado-destino', raiz);
  const disponibleEnOrigen = (productoId) => existenciasEn(estado.productos.find((producto) => producto.id === productoId), origen.value);
  const pintarLineas = () => {
    cuerpo.innerHTML = repetir(documento, 'fila-linea-traslado', lineas.map((linea, posicion) => ({
      posicion, id: linea.productoId, nombre: linea.nombre, cantidad: linea.cantidad || '', disponible: disponibleEnOrigen(linea.productoId), icono: icono(ICONO_PAPELERA),
    })));
    activarCamposNumericos(cuerpo);
    buscar('#sin-lineas-traslado', raiz).hidden = lineas.length > 0;
  };
  montarSelectorProductos(raiz, {
    alElegir: (producto) => {
      const existente = lineas.find((linea) => linea.productoId === producto.id);
      if (existente) existente.cantidad += 1;
      else lineas.push({ productoId: producto.id, nombre: producto.nombre, cantidad: 1 });
      pintarLineas();
    },
  });
  cuerpo.addEventListener('input', (evento) => {
    const campoLinea = evento.target.closest('[data-campo]');
    if (campoLinea) lineas[Number(campoLinea.closest('tr').dataset.posicion)].cantidad = leerEntero(campoLinea.value);
  });
  cuerpo.addEventListener('click', (evento) => {
    const quitar = evento.target.closest('[data-quitar]');
    if (!quitar) return;
    lineas.splice(Number(quitar.closest('tr').dataset.posicion), 1);
    pintarLineas();
  });
  origen.onchange = pintarLineas;
  buscar('#nuevo-traslado', raiz).onclick = () => {
    if (activas.length < 2) return contexto.alerta('Se necesitan al menos dos bodegas activas para trasladar');
    // Por defecto sale de la bodega de la tienda activa hacia la siguiente
    origen.value = bodegaActiva()?.id ?? activas[0].id;
    destino.value = activas.find((bodega) => bodega.id !== origen.value).id;
    panelTraslado.hidden = false;
    pintarLineas();
    origen.focus();
  };
  buscar('#cancelar-traslado', raiz).onclick = () => { panelTraslado.hidden = true; };
  buscar('#enviar-traslado', raiz).onclick = () => {
    const traslado = ejecutar(() => servicioBodegas.enviarTraslado({
      origenId: origen.value,
      destinoId: destino.value,
      observaciones: buscar('#traslado-observaciones', raiz).value,
      lineas,
    }), 'Traslado enviado correctamente');
    if (traslado) contexto.redibujar();
  };

  // --- Historial de traslados ------------------------------------------------------------------------------
  const nombreBodega = (id) => buscarBodega(id)?.nombre ?? id;
  montarCuadricula(buscar('#cuadricula-traslados', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Traslados',
    vacio: 'Aún no hay traslados.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '90px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '120px' },
      { clave: 'origen', titulo: 'Sale de', ancho: 'minmax(0, 1fr)' },
      { clave: 'destino', titulo: 'Llega a', ancho: 'minmax(0, 1fr)' },
      { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'estado', titulo: 'Estado', ancho: '120px' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '190px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: estado.traslados.slice().reverse().map((traslado) => ({
      id: traslado.id,
      fecha: aFecha(traslado.fecha),
      origen: nombreBodega(traslado.origenId),
      destino: nombreBodega(traslado.destinoId),
      productos: traslado.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', '),
      estado: servicioBodegas.ESTADOS_TRASLADO[traslado.estado],
      acciones: traslado.estado === 'enviado' && puede('bodegas', 'editar') ? repetir(documento, 'acciones-traslado', [{ id: traslado.id }]) : '',
    })),
  });
  buscar('#cuadricula-traslados', raiz).addEventListener('click', (evento) => {
    const recibir = evento.target.closest('[data-recibir]');
    if (recibir) {
      if (ejecutar(() => servicioBodegas.recibirTraslado(recibir.dataset.recibir), `Traslado ${recibir.dataset.recibir} recibido correctamente`)) contexto.redibujar();
      return;
    }
    const anular = evento.target.closest('[data-anular]');
    if (!anular) return;
    if (!puede('bodegas', 'eliminar')) return contexto.alerta('Tu rol no permite anular traslados');
    trasladoPorAnular = anular.dataset.anular;
    buscar('#texto-anular-traslado', raiz).textContent = `¿Anular el traslado ${trasladoPorAnular}? La mercancía vuelve al origen.`;
    buscar('#confirmar-anular-traslado', raiz).hidden = false;
    buscar('#motivo-anular-traslado', raiz).focus();
  });
  buscar('#anular-traslado-no', raiz).onclick = () => { buscar('#confirmar-anular-traslado', raiz).hidden = true; };
  buscar('#anular-traslado-si', raiz).onclick = () => {
    if (ejecutar(() => servicioBodegas.anularTraslado(trasladoPorAnular, buscar('#motivo-anular-traslado', raiz).value), `Traslado ${trasladoPorAnular} anulado correctamente`)) contexto.redibujar();
  };

  if (location.hash === '#traslados') buscar('#traslados', raiz).scrollIntoView();
}
