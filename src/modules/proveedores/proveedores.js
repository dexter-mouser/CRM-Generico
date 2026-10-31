import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { puede } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import * as servicioProveedores from '../../services/proveedores.service.js';
import { dibujarSelector, montarSelectorProductos } from '../../components/selector-productos/selector-productos.js';
import { mostrarComprobanteDeOrden } from '../../components/recibo/comprobantes.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';

let documento;
let plantillasCuadricula;

export async function dibujar() {
  documento = await cargarHtml(new URL('./proveedores.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  return seccion(documento, 'principal', {
    opcionesProveedor: repetir(documento, 'opcion', estado.proveedores.map((proveedor) => ({ valor: proveedor.id, texto: `${proveedor.nombre} · ${proveedor.id}` }))),
    selector: await dibujarSelector(),
  });
}

export function montar(raiz, contexto) {
  const campos = ['nombre', 'nit', 'plazoDias', 'contacto', 'telefono', 'correo'];
  const campo = (nombre) => buscar(`#proveedor-${nombre}`, raiz);
  let enEdicion = null;
  let porEliminar = null;
  let ordenPorAnular = null;
  buscar('#nuevo-proveedor', raiz).hidden = !puede('proveedores', 'crear');
  buscar('#nueva-orden', raiz).hidden = !puede('proveedores', 'crear');

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

  // --- Proveedores -----------------------------------------------------------------------------------------
  const filasProveedores = () => estado.proveedores.map((proveedor) => ({
    ...proveedor,
    plazo: `${proveedor.plazoDias} días`,
    saldo: aPesos(servicioProveedores.saldoConProveedor(proveedor.id)),
  }));
  const cuadriculaProveedores = montarCuadricula(buscar('#cuadricula-proveedores', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Proveedores',
    vacio: 'Aún no hay proveedores. Crea uno con "Nuevo proveedor".',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '84px' },
      { clave: 'nombre', titulo: 'Nombre', ancho: 'minmax(0, 1.3fr)' },
      { clave: 'nit', titulo: 'NIT', ancho: '130px' },
      { clave: 'contacto', titulo: 'Contacto', ancho: 'minmax(0, 1fr)' },
      { clave: 'telefono', titulo: 'Teléfono', ancho: '120px' },
      { clave: 'plazo', titulo: 'Plazo', ancho: '84px' },
      { clave: 'saldo', titulo: 'Por pagar', ancho: '112px', alinear: 'derecha' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '190px', filtrable: false, html: (fila) => repetir(documento, 'acciones-proveedor', [{ id: fila.id }]) },
    ],
    filas: filasProveedores(),
  });

  const abrirFormulario = (proveedor) => {
    enEdicion = proveedor?.id ?? null;
    buscar('#titulo-formulario-proveedor', raiz).textContent = proveedor ? `Editar a ${proveedor.nombre}` : 'Nuevo proveedor';
    campos.forEach((nombre) => { campo(nombre).value = proveedor?.[nombre] ?? (nombre === 'plazoDias' ? '30' : ''); });
    buscar('#formulario-proveedor', raiz).hidden = false;
    campo('nombre').focus();
  };
  buscar('#nuevo-proveedor', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-proveedor', raiz).onclick = () => { buscar('#formulario-proveedor', raiz).hidden = true; };
  buscar('#guardar-proveedor', raiz).onclick = () => {
    const datos = Object.fromEntries(campos.map((nombre) => [nombre, campo(nombre).value]));
    datos.plazoDias = leerEntero(datos.plazoDias);
    const editando = enEdicion !== null;
    const aplicado = ejecutar(
      () => (editando ? servicioProveedores.actualizarProveedor(enEdicion, datos) : servicioProveedores.agregarProveedor(datos)),
      editando ? 'Proveedor actualizado correctamente' : 'Proveedor agregado correctamente',
    );
    if (aplicado) contexto.redibujar();
  };

  buscar('#cuadricula-proveedores', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    const proveedor = servicioProveedores.buscarProveedor(boton.dataset.editar ?? boton.dataset.eliminar);
    if (!proveedor) return;
    if (boton.dataset.editar) return abrirFormulario(proveedor);
    porEliminar = proveedor.id;
    buscar('#texto-eliminar', raiz).textContent = `¿Eliminar a ${proveedor.nombre}?`;
    buscar('#confirmar-eliminar', raiz).hidden = false;
  });
  buscar('#eliminar-no', raiz).onclick = () => { buscar('#confirmar-eliminar', raiz).hidden = true; };
  buscar('#eliminar-si', raiz).onclick = () => {
    buscar('#confirmar-eliminar', raiz).hidden = true;
    if (ejecutar(() => servicioProveedores.eliminarProveedor(porEliminar), 'Proveedor eliminado correctamente')) cuadriculaProveedores.actualizar(filasProveedores());
  };

  // --- Órdenes de compra -----------------------------------------------------------------------------------
  const lineas = [];
  const cuerpo = buscar('#lineas-orden', raiz);
  const subtotal = (linea) => linea.cantidad * linea.costoUnitario;
  const pintarLineas = () => {
    cuerpo.innerHTML = repetir(documento, 'fila-linea-orden', lineas.map((linea, posicion) => ({
      posicion, id: linea.productoId, nombre: linea.nombre, cantidad: linea.cantidad || '', costoUnitario: linea.costoUnitario || '',
      subtotal: aPesos(subtotal(linea)), icono: icono(ICONO_PAPELERA),
    })));
    activarCamposNumericos(cuerpo);
    buscar('#sin-lineas-orden', raiz).hidden = lineas.length > 0;
    buscar('#total-orden', raiz).textContent = aPesos(lineas.reduce((suma, linea) => suma + subtotal(linea), 0));
  };
  montarSelectorProductos(raiz, {
    alElegir: (producto) => {
      const existente = lineas.find((linea) => linea.productoId === producto.id);
      if (existente) existente.cantidad += 1;
      else lineas.push({ productoId: producto.id, nombre: producto.nombre, cantidad: 1, costoUnitario: producto.costo });
      pintarLineas();
    },
  });
  cuerpo.addEventListener('input', (evento) => {
    const campoLinea = evento.target.closest('[data-campo]');
    if (!campoLinea) return;
    const fila = campoLinea.closest('tr');
    const linea = lineas[Number(fila.dataset.posicion)];
    linea[campoLinea.dataset.campo] = leerEntero(campoLinea.value);
    buscar('[data-subtotal]', fila).textContent = aPesos(subtotal(linea));
    buscar('#total-orden', raiz).textContent = aPesos(lineas.reduce((suma, otra) => suma + subtotal(otra), 0));
  });
  cuerpo.addEventListener('click', (evento) => {
    const quitar = evento.target.closest('[data-quitar]');
    if (!quitar) return;
    lineas.splice(Number(quitar.closest('tr').dataset.posicion), 1);
    pintarLineas();
  });
  const panelOrden = buscar('#panel-orden', raiz);
  buscar('#nueva-orden', raiz).onclick = () => {
    if (!estado.proveedores.length) return contexto.alerta('Crea primero un proveedor');
    panelOrden.hidden = false;
    buscar('#orden-proveedor', raiz).focus();
  };
  buscar('#cancelar-orden', raiz).onclick = () => { panelOrden.hidden = true; };
  buscar('#registrar-orden', raiz).onclick = () => {
    const orden = ejecutar(() => servicioProveedores.registrarOrden({
      proveedorId: buscar('#orden-proveedor', raiz).value,
      observaciones: buscar('#orden-observaciones', raiz).value,
      lineas,
    }), 'Orden de compra registrada correctamente');
    if (!orden) return;
    contexto.redibujar();
    mostrarComprobanteDeOrden(orden);
  };

  montarCuadricula(buscar('#cuadricula-ordenes', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Órdenes de compra',
    vacio: 'Aún no hay órdenes de compra.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '90px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '130px' },
      { clave: 'proveedor', titulo: 'Proveedor', ancho: 'minmax(0, 1fr)' },
      { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'total', titulo: 'Total', ancho: '112px', alinear: 'derecha' },
      { clave: 'estado', titulo: 'Estado', ancho: '150px' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '290px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: estado.ordenesCompra.slice().reverse().map((orden) => ({
      id: orden.id,
      fecha: aFecha(orden.fecha),
      proveedor: orden.proveedor,
      productos: orden.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', '),
      total: aPesos(orden.total),
      estado: servicioProveedores.ESTADOS_ORDEN[orden.estado] + (orden.facturaNumero ? ` · factura ${orden.facturaNumero}` : ''),
      acciones: repetir(documento, 'acciones-orden', [{
        id: orden.id,
        abierta: orden.estado === 'abierta' && puede('inventario', 'crear') ? repetir(documento, 'acciones-orden-abierta', [{ id: orden.id }]) : '',
      }]),
    })),
  });

  buscar('#cuadricula-ordenes', raiz).addEventListener('click', (evento) => {
    const comprobante = evento.target.closest('[data-comprobante-orden]');
    if (comprobante) return mostrarComprobanteDeOrden(servicioProveedores.buscarOrden(comprobante.dataset.comprobanteOrden));
    const anular = evento.target.closest('[data-anular-orden]');
    if (!anular) return;
    ordenPorAnular = anular.dataset.anularOrden;
    buscar('#texto-anular-orden', raiz).textContent = `¿Anular la orden ${ordenPorAnular}?`;
    buscar('#confirmar-anular-orden', raiz).hidden = false;
    buscar('#motivo-anular-orden', raiz).focus();
  });
  buscar('#anular-orden-no', raiz).onclick = () => { buscar('#confirmar-anular-orden', raiz).hidden = true; };
  buscar('#anular-orden-si', raiz).onclick = () => {
    if (ejecutar(() => servicioProveedores.anularOrden(ordenPorAnular, buscar('#motivo-anular-orden', raiz).value), `Orden ${ordenPorAnular} anulada correctamente`)) contexto.redibujar();
  };

  pintarLineas();
}
