import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { buscar } from '../../core/dom.js';
import { puede } from '../../core/autorizacion.js';
import * as servicioVentas from '../../services/ventas.service.js';
import { mostrarReciboDeVenta, mostrarComprobanteDeDevolucion } from '../../components/recibo/comprobantes.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';

let documento;
let plantillasCuadricula;

function estadoDeFactura(venta) {
  if (servicioVentas.estaAnulada(venta)) return { texto: 'Anulada', clase: '' };
  if (servicioVentas.devolucionesDeVenta(venta.id).length) return { texto: 'Con devolución', clase: 'suave' };
  return { texto: 'Activa', clase: 'suave' };
}

function estadoDeDocumento(registro) {
  if (registro.anulado) return 'Anulado';
  return registro.facturadaEn ? `Facturado en ${registro.facturadaEn}` : 'Pendiente';
}

const insignia = (texto, clase) => `<span class="insignia ${clase}">${texto}</span>`;
const etiquetaDe = (tipo) => servicioVentas.TIPOS_DOCUMENTO[tipo].etiqueta;

export async function dibujar() {
  documento = await cargarHtml(new URL('./ventas.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  return seccion(documento, 'principal');
}

export function montar(raiz, contexto) {
  const zona = buscar('#zona-devolucion', raiz);
  const puedeAnular = puede('ventas', 'eliminar');

  const filasFacturas = () => estado.ventas.slice().reverse().map((venta) => {
    const situacion = estadoDeFactura(venta);
    const pendiente = servicioVentas.pendientesDeDevolver(venta).length > 0;
    const acciones = puedeAnular && pendiente && !servicioVentas.estaAnulada(venta) ? repetir(documento, 'acciones-venta', [{ id: venta.id }]) : '';
    return {
      id: venta.id,
      fecha: aFecha(venta.fecha),
      cliente: venta.cliente,
      productos: servicioVentas.resumirItems(venta),
      metodo: venta.metodo,
      total: aPesos(venta.total),
      estado: situacion.texto,
      insignia: insignia(situacion.texto, situacion.clase),
      acciones: repetir(documento, 'acciones-factura', [{ id: venta.id, acciones }]),
    };
  });

  const filasDocumentos = () => estado.documentos.slice().reverse().map((registro) => {
    const acciones = servicioVentas.documentoPendiente(registro) && puede('nueva-venta', 'crear')
      ? repetir(documento, 'acciones-documento-pendiente', [{ id: registro.id }]) : '';
    return {
      id: registro.id,
      tipo: etiquetaDe(registro.tipo),
      fecha: aFecha(registro.fecha),
      cliente: registro.cliente,
      productos: servicioVentas.resumirItems(registro),
      total: aPesos(registro.total),
      estado: estadoDeDocumento(registro),
      acciones: repetir(documento, 'acciones-documento', [{ id: registro.id, acciones }]),
    };
  });

  const filasNotas = () => estado.devoluciones.slice().reverse().map((nota) => ({
    id: nota.id,
    fecha: aFecha(nota.fecha),
    ventaId: nota.ventaId,
    tipo: servicioVentas.ETIQUETA_NOTA[nota.tipo],
    productos: servicioVentas.resumirItems(nota),
    motivo: nota.motivo,
    usuario: nota.usuario,
    total: aPesos(nota.total),
    acciones: repetir(documento, 'acciones-nota', [{ id: nota.id, ventaId: nota.ventaId }]),
  }));

  montarCuadricula(buscar('#cuadricula-facturas', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Facturas de venta',
    vacio: 'Aún no hay facturas de venta.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '84px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '130px' },
      { clave: 'cliente', titulo: 'Cliente', ancho: 'minmax(0, 1fr)' },
      { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'metodo', titulo: 'Pago', ancho: '104px' },
      { clave: 'total', titulo: 'Total', ancho: '104px', alinear: 'derecha' },
      { clave: 'estado', titulo: 'Estado', ancho: '124px', html: (fila) => fila.insignia },
      { clave: 'acciones', titulo: 'Acciones', ancho: '300px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: filasFacturas(),
  });

  montarCuadricula(buscar('#cuadricula-documentos', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Remisiones y cotizaciones',
    vacio: 'Aún no hay remisiones ni cotizaciones. Créalas en Registrar venta eligiendo el documento.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '96px' },
      { clave: 'tipo', titulo: 'Documento', ancho: '104px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '130px' },
      { clave: 'cliente', titulo: 'Cliente', ancho: 'minmax(0, 1fr)' },
      { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'total', titulo: 'Total', ancho: '104px', alinear: 'derecha' },
      { clave: 'estado', titulo: 'Estado', ancho: '140px' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '310px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: filasDocumentos(),
  });

  montarCuadricula(buscar('#cuadricula-notas', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Notas de devolución y de anulación',
    vacio: 'Aún no hay notas de devolución ni de anulación.',
    columnas: [
      { clave: 'id', titulo: 'N° de nota', ancho: '96px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '130px' },
      { clave: 'ventaId', titulo: 'Factura', ancho: '84px' },
      { clave: 'tipo', titulo: 'Tipo', ancho: '140px' },
      { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 1.4fr)' },
      { clave: 'motivo', titulo: 'Motivo', ancho: 'minmax(0, 1fr)' },
      { clave: 'usuario', titulo: 'Registró', ancho: '110px' },
      { clave: 'total', titulo: 'Total', ancho: '104px', alinear: 'derecha' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '230px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: filasNotas(),
  });

  // Panel con motivo para devolver, anular una factura o anular una remisión o cotización
  function abrirPanel({ titulo, descripcion, columnaCantidad, filas, esAnulacion, plantillaFilas, alConfirmar, textoBoton }) {
    zona.innerHTML = seccion(documento, 'panel-devolucion', {
      titulo,
      descripcion,
      columnaCantidad,
      filas: repetir(documento, plantillaFilas, filas),
      claseBoton: esAnulacion ? 'peligro' : 'primario',
      textoBoton,
    });
    activarCamposNumericos(zona);
    zona.scrollIntoView({ block: 'nearest' });
    (buscar('[data-cantidad-producto]', zona) ?? buscar('#motivo-devolucion', zona)).focus();

    buscar('#cancelar-devolucion', zona).onclick = () => { zona.innerHTML = ''; };
    buscar('#confirmar-devolucion', zona).onclick = () => {
      try {
        alConfirmar(buscar('#motivo-devolucion', zona).value);
      } catch (error) {
        contexto.alerta(error.message);
      }
    };
  }

  function panelDeFactura(ventaId, esAnulacion) {
    const venta = estado.ventas.find((candidata) => candidata.id === ventaId);
    const pendientes = servicioVentas.pendientesDeDevolver(venta).map((item) => ({ ...item, valorUnitario: aPesos(item.valorUnitario) }));
    abrirPanel({
      titulo: esAnulacion ? `Anular la factura ${venta.id}` : `Devolver productos de la factura ${venta.id}`,
      descripcion: esAnulacion
        ? 'Se devuelve todo lo que queda de la factura: vuelve al stock, se reintegra el dinero y se genera una nota de anulación (NA). Solo se anulan facturas de días con la contabilidad abierta.'
        : 'Escribe cuántas unidades devuelve el cliente de cada producto. Se genera una nota de devolución (ND) anclada a la factura.',
      columnaCantidad: esAnulacion ? 'Se devuelve' : 'Cantidad a devolver',
      filas: pendientes,
      esAnulacion,
      plantillaFilas: esAnulacion ? 'fila-anular-item' : 'fila-devolver-item',
      textoBoton: esAnulacion ? 'Anular factura' : 'Registrar devolución',
      alConfirmar: (motivo) => {
        let nota;
        if (esAnulacion) nota = servicioVentas.anularVenta(ventaId, motivo);
        else {
          const cantidades = {};
          zona.querySelectorAll('[data-cantidad-producto]').forEach((campo) => {
            cantidades[campo.dataset.cantidadProducto] = leerEntero(campo.value);
          });
          nota = servicioVentas.devolverProductos(ventaId, cantidades, motivo);
        }
        contexto.aviso(esAnulacion ? `Factura ${ventaId} anulada correctamente: nota ${nota.id}` : `Devolución registrada correctamente: nota ${nota.id}`);
        contexto.redibujar();
        mostrarComprobanteDeDevolucion(nota);
      },
    });
  }

  function panelDeDocumento(id) {
    const registro = servicioVentas.buscarDocumento(id);
    abrirPanel({
      titulo: `Anular ${etiquetaDe(registro.tipo).toLowerCase()} ${id}`,
      descripcion: registro.tipo === 'remision' ? 'Lo entregado vuelve al stock.' : 'La cotización deja de poder facturarse.',
      columnaCantidad: 'Cantidad',
      filas: registro.items.map((item) => ({ ...item, valorUnitario: aPesos(item.valorUnitario), disponibles: item.cantidad })),
      esAnulacion: true,
      plantillaFilas: 'fila-anular-item',
      textoBoton: 'Anular documento',
      alConfirmar: (motivo) => {
        servicioVentas.anularDocumento(id, motivo);
        contexto.aviso(`${etiquetaDe(registro.tipo)} ${id} anulada correctamente`);
        contexto.redibujar();
      },
    });
  }

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const recibo = evento.target.closest('[data-recibo]');
    if (recibo) return mostrarReciboDeVenta(estado.ventas.find((venta) => venta.id === recibo.dataset.recibo));
    const devolver = evento.target.closest('[data-devolver]');
    if (devolver) return panelDeFactura(devolver.dataset.devolver, false);
    const anular = evento.target.closest('[data-anular]');
    if (anular) return panelDeFactura(anular.dataset.anular, true);
    const anularDocumento = evento.target.closest('[data-anular-documento]');
    if (anularDocumento) return panelDeDocumento(anularDocumento.dataset.anularDocumento);
    const verDocumento = evento.target.closest('[data-documento]');
    if (verDocumento) return mostrarReciboDeVenta(servicioVentas.buscarDocumento(verDocumento.dataset.documento));
    const comprobante = evento.target.closest('[data-comprobante]');
    if (comprobante) mostrarComprobanteDeDevolucion(estado.devoluciones.find((nota) => nota.id === comprobante.dataset.comprobante));
  });
}
