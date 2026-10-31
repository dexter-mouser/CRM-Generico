import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos } from '../../core/format.js';
import { puede } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { buscarTienda, resumenDeTienda, agregarTienda, actualizarTienda, cambiarEstadoTienda } from '../../services/tiendas.service.js';

const CAMPOS = ['nombre', 'ciudad', 'telefono', 'direccion', 'bodegaId'];
let documento;

export async function dibujar() {
  documento = await cargarHtml(new URL('./tiendas.html', import.meta.url));
  const editar = puede('tiendas', 'editar');
  const fichas = estado.tiendas.map((tienda) => {
    const resumen = resumenDeTienda(tienda.id);
    return {
      ...tienda,
      ciudad: tienda.ciudad || 'Sin ciudad',
      telefono: tienda.telefono || '—',
      direccion: tienda.direccion || 'Sin dirección registrada',
      clase: tienda.activa ? '' : 'inactiva',
      estadoTexto: tienda.activa ? 'Activa' : 'Inactiva',
      ventasMes: aPesos(resumen.ventasMes),
      cantidadMes: resumen.cantidadMes,
      caja: resumen.cajaAbierta ? 'Abierta' : 'Cerrada',
      empleados: resumen.empleados,
      bodega: estado.bodegas.find((bodega) => bodega.id === tienda.bodegaId)?.nombre ?? '—',
      acciones: editar ? repetir(documento, 'acciones-tienda', [{ id: tienda.id, textoEstado: tienda.activa ? 'Desactivar' : 'Activar' }]) : '',
    };
  });
  return seccion(documento, 'principal', {
    fichas: repetir(documento, 'ficha-tienda', fichas),
    opcionesBodega: repetir(documento, 'opcion', [{ valor: '', texto: 'Crear una bodega nueva' }, ...estado.bodegas.filter((bodega) => bodega.activa).map((bodega) => ({ valor: bodega.id, texto: `${bodega.nombre} · ${bodega.id}` }))]),
  });
}

export function montar(raiz, contexto) {
  const campo = (nombre) => buscar(`#tienda-${nombre}`, raiz);
  const formulario = buscar('#formulario-tienda', raiz);
  let enEdicion = null;
  buscar('#nueva-tienda', raiz).hidden = !puede('tiendas', 'crear');

  const ejecutar = (accion, mensaje) => {
    try {
      accion();
      contexto.aviso(mensaje);
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  const abrirFormulario = (tienda) => {
    enEdicion = tienda?.id ?? null;
    buscar('#titulo-formulario-tienda', raiz).textContent = tienda ? `Editar ${tienda.nombre}` : 'Nueva tienda';
    // Al editar no se ofrece "crear bodega nueva": la tienda debe quedar con una bodega existente
    campo('bodegaId').options[0].hidden = Boolean(tienda);
    CAMPOS.forEach((nombre) => { campo(nombre).value = tienda?.[nombre] ?? ''; });
    formulario.hidden = false;
    campo('nombre').focus();
  };
  buscar('#nueva-tienda', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-tienda', raiz).onclick = () => { formulario.hidden = true; };
  buscar('#guardar-tienda', raiz).onclick = () => {
    const datos = Object.fromEntries(CAMPOS.map((nombre) => [nombre, campo(nombre).value]));
    if (enEdicion) ejecutar(() => actualizarTienda(enEdicion, datos), 'Tienda actualizada correctamente');
    else ejecutar(() => agregarTienda(datos), 'Tienda creada correctamente');
  };

  buscar('#fichas-tiendas', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    const tienda = buscarTienda(boton.dataset.editar ?? boton.dataset.estado);
    if (!tienda) return;
    if (boton.dataset.editar) return abrirFormulario(tienda);
    ejecutar(() => cambiarEstadoTienda(tienda.id, !tienda.activa), `${tienda.nombre} ${tienda.activa ? 'desactivada' : 'activada'} correctamente`);
  });

  if (new URLSearchParams(location.search).get('nueva') === '1' && puede('tiendas', 'crear')) abrirFormulario(null);
}
