import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos } from '../../core/format.js';
import { puede } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { buscarTienda, resumenDeTienda, agregarTienda, actualizarTienda, cambiarEstadoTienda } from '../../services/tiendas.service.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { cargarPlantillasFicha, crearFicha } from '../../components/ficha-registro/ficha-registro.js';

const CAMPOS = ['nombre', 'ciudad', 'telefono', 'direccion', 'bodegaId'];
let documento;
let plantillasCuadricula;
let plantillasFicha;

const nombreBodega = (id) => estado.bodegas.find((bodega) => bodega.id === id)?.nombre ?? '—';

export async function dibujar() {
  documento = await cargarHtml(new URL('./tiendas.html', import.meta.url));
  [plantillasCuadricula, plantillasFicha] = await Promise.all([cargarPlantillasCuadricula(), cargarPlantillasFicha()]);
  return seccion(documento, 'principal', {
    opcionesBodega: repetir(documento, 'opcion', [{ valor: '', texto: 'Crear una bodega nueva' }, ...estado.bodegas.filter((bodega) => bodega.activa).map((bodega) => ({ valor: bodega.id, texto: `${bodega.nombre} · ${bodega.id}` }))]),
  });
}

export function montar(raiz, contexto) {
  const campo = (nombre) => buscar(`#tienda-${nombre}`, raiz);
  const formulario = buscar('#formulario-tienda', raiz);
  const ficha = crearFicha(buscar('#ficha-tienda', raiz), plantillasFicha);
  const puedeEditar = puede('tiendas', 'editar');
  let enEdicion = null;
  buscar('#nueva-tienda', raiz).hidden = !puede('tiendas', 'crear');

  const ejecutar = (accion, mensaje) => {
    try {
      accion();
      contexto.aviso(mensaje);
      return true;
    } catch (error) {
      contexto.alerta(error.message);
      return false;
    }
  };

  const botonesEdicion = (tienda) => (puedeEditar ? repetir(documento, 'botones-edicion', [{
    id: tienda.id,
    textoEstado: tienda.activa ? 'Desactivar' : 'Activar',
    claseEstado: tienda.activa ? 'peligro' : '',
  }]) : '');

  const filas = () => estado.tiendas.map((tienda) => {
    const resumen = resumenDeTienda(tienda.id);
    return {
      ...tienda,
      bodega: nombreBodega(tienda.bodegaId),
      ventasMes: aPesos(resumen.ventasMes),
      caja: resumen.cajaAbierta ? 'Abierta' : 'Cerrada',
      empleados: String(resumen.empleados),
      estadoTexto: tienda.activa ? 'Activa' : 'Inactiva',
    };
  });

  const cuadricula = montarCuadricula(buscar('#cuadricula-tiendas', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Tiendas',
    vacio: 'Aún no hay tiendas. Crea una con "Nueva tienda".',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '64px' },
      { clave: 'nombre', titulo: 'Nombre', ancho: 'minmax(0, 1.2fr)' },
      { clave: 'ciudad', titulo: 'Ciudad', ancho: '110px' },
      { clave: 'bodega', titulo: 'Bodega', ancho: 'minmax(0, 1fr)' },
      { clave: 'ventasMes', titulo: 'Ventas del mes', ancho: '120px', alinear: 'derecha' },
      { clave: 'caja', titulo: 'Caja', ancho: '84px' },
      { clave: 'estadoTexto', titulo: 'Estado', ancho: '90px', html: (fila) => repetir(documento, 'estado-registro', [{ texto: fila.estadoTexto, clase: fila.activa ? 'suave' : '' }]) },
      { clave: 'acciones', titulo: 'Acciones', ancho: '290px', filtrable: false, html: (fila) => repetir(documento, 'acciones-tienda', [{ id: fila.id, editar: botonesEdicion(fila) }]) },
    ],
    filas: filas(),
  });
  const pintar = () => cuadricula.actualizar(filas());

  // --- Formulario -------------------------------------------------------------------------------------------
  const abrirFormulario = (tienda) => {
    enEdicion = tienda?.id ?? null;
    buscar('#titulo-formulario-tienda', raiz).textContent = tienda ? `Editar ${tienda.nombre}` : 'Nueva tienda';
    // Al editar no se ofrece "crear bodega nueva": la tienda debe quedar con una bodega existente
    campo('bodegaId').options[0].hidden = Boolean(tienda);
    CAMPOS.forEach((nombre) => { campo(nombre).value = tienda?.[nombre] ?? ''; });
    formulario.hidden = false;
    formulario.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    campo('nombre').focus();
  };
  buscar('#nueva-tienda', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-tienda', raiz).onclick = () => { formulario.hidden = true; };
  buscar('#guardar-tienda', raiz).onclick = () => {
    const datos = Object.fromEntries(CAMPOS.map((nombre) => [nombre, campo(nombre).value]));
    const aplicado = enEdicion
      ? ejecutar(() => actualizarTienda(enEdicion, datos), 'Tienda actualizada correctamente')
      : ejecutar(() => agregarTienda(datos), 'Tienda creada correctamente');
    if (!aplicado) return;
    // Una tienda nueva puede crear su bodega: se redibuja para que aparezca en la lista de bodegas
    if (!enEdicion) return contexto.redibujar();
    formulario.hidden = true;
    pintar();
    ficha.refrescar();
  };

  // --- Ficha ------------------------------------------------------------------------------------------------
  const abrirFicha = (id) => ficha.abrir(id, () => {
    const tienda = buscarTienda(id);
    if (!tienda) return null;
    const resumen = resumenDeTienda(tienda.id);
    return {
      etiqueta: 'Ficha de la tienda',
      titulo: `${tienda.nombre} · ${tienda.id}`,
      subtitulo: [tienda.ciudad, tienda.activa ? 'Activa' : 'Inactiva'].filter(Boolean).join(' · '),
      indicadores: [
        { etiqueta: 'Ventas del mes', valor: aPesos(resumen.ventasMes) },
        { etiqueta: 'N° de ventas del mes', valor: String(resumen.cantidadMes) },
        { etiqueta: 'Caja', valor: resumen.cajaAbierta ? 'Abierta' : 'Cerrada' },
        { etiqueta: 'Empleados activos', valor: String(resumen.empleados) },
      ],
      datos: [
        { etiqueta: 'Bodega donde vende', valor: `${nombreBodega(tienda.bodegaId)} · ${tienda.bodegaId}` },
        { etiqueta: 'Ciudad', valor: tienda.ciudad ?? '' },
        { etiqueta: 'Teléfono', valor: tienda.telefono ?? '' },
        { etiqueta: 'Dirección', valor: tienda.direccion ?? '', ancho: true },
      ],
      alEditar: puedeEditar ? () => abrirFormulario(buscarTienda(id)) : null,
    };
  });

  const alTocar = (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    const tienda = buscarTienda(boton.dataset.ficha ?? boton.dataset.editar ?? boton.dataset.estado);
    if (!tienda) return;
    if (boton.dataset.ficha) return abrirFicha(tienda.id);
    if (boton.dataset.editar) return abrirFormulario(tienda);
    if (ejecutar(() => cambiarEstadoTienda(tienda.id, !tienda.activa), `${tienda.nombre} ${tienda.activa ? 'desactivada' : 'activada'} correctamente`)) {
      pintar();
      ficha.refrescar();
    }
  };
  buscar('#cuadricula-tiendas', raiz).addEventListener('click', alTocar);

  if (new URLSearchParams(location.search).get('nueva') === '1' && puede('tiendas', 'crear')) abrirFormulario(null);
}
