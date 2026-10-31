import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aFecha, fechaDeHoy } from '../../core/format.js';
import { puede, usuarioActual } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import * as servicioActividades from '../../services/actividades.service.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { cargarPlantillasFicha, crearFicha } from '../../components/ficha-registro/ficha-registro.js';
import { refrescarAlertas } from '../../components/header/header.js';

let documento;
let plantillasCuadricula;
let plantillasFicha;

const opciones = (pares) => repetir(documento, 'opcion', pares.map(([valor, texto]) => ({ valor, texto })));
const nombreCliente = (id) => estado.clientes.find((cliente) => cliente.id === id)?.nombre ?? id;
const buscarActividad = (id) => estado.actividades.find((actividad) => actividad.id === id);

export async function dibujar() {
  documento = await cargarHtml(new URL('./seguimiento.html', import.meta.url));
  [plantillasCuadricula, plantillasFicha] = await Promise.all([cargarPlantillasCuadricula(), cargarPlantillasFicha()]);
  return seccion(documento, 'principal', {
    hoy: fechaDeHoy(),
    opcionesCliente: opciones(estado.clientes.map((cliente) => [cliente.id, `${cliente.nombre} · ${cliente.id}`])),
    opcionesActividad: opciones(Object.entries(servicioActividades.TIPOS_ACTIVIDAD)),
    opcionesResponsable: opciones(estado.usuarios.filter((usuario) => usuario.activo).map((usuario) => [usuario.correo, usuario.nombre])),
  });
}

export function montar(raiz, contexto) {
  let actividadEnEdicion = null; // id de la actividad que se edita; null si se registra una nueva
  const campo = (nombre) => buscar(`#actividad-${nombre}`, raiz);
  const formulario = buscar('#formulario-actividad', raiz);
  const ficha = crearFicha(buscar('#ficha-actividad', raiz), plantillasFicha);
  buscar('#nueva-actividad', raiz).hidden = !puede('seguimiento', 'crear');

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

  const estadoDe = (actividad) => {
    if (!servicioActividades.esPendiente(actividad)) return { texto: actividad.tipo === 'tarea' ? 'Hecha' : 'Registrada', clase: 'suave' };
    return servicioActividades.estaVencidaTarea(actividad) ? { texto: 'Vencida', clase: '' } : { texto: 'Pendiente', clase: 'suave' };
  };

  // --- Formulario (nueva actividad o edición) -------------------------------------------------------------
  const mostrarCamposTarea = (actividad) => {
    const esTarea = actividad ? servicioActividades.esPendiente(actividad) : campo('tipo').value === 'tarea';
    buscar('#campos-tarea', raiz).hidden = !esTarea;
  };
  campo('tipo').onchange = () => mostrarCamposTarea(null);

  const abrirFormulario = (actividad) => {
    actividadEnEdicion = actividad?.id ?? null;
    buscar('#titulo-formulario-actividad', raiz).textContent = actividad ? `Editar ${actividad.id}` : 'Nueva actividad o tarea';
    campo('cliente').disabled = Boolean(actividad);
    campo('tipo').disabled = Boolean(actividad);
    campo('cliente').value = actividad?.clienteId ?? campo('cliente').value;
    campo('tipo').value = actividad?.tipo ?? 'llamada';
    campo('descripcion').value = actividad?.descripcion ?? '';
    campo('resultado').value = actividad?.resultado ?? '';
    campo('vence').value = actividad?.vence ? actividad.vence.slice(0, 10) : fechaDeHoy();
    campo('responsable').value = actividad?.responsableCorreo || usuarioActual()?.correo || '';
    buscar('#campo-resultado', raiz).hidden = !actividad;
    mostrarCamposTarea(actividad);
    formulario.hidden = false;
    formulario.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    campo('descripcion').focus();
  };
  const cerrarFormulario = () => { formulario.hidden = true; };

  buscar('#nueva-actividad', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-actividad', raiz).onclick = cerrarFormulario;
  buscar('#guardar-actividad', raiz).onclick = () => {
    const datos = {
      clienteId: campo('cliente').value,
      tipo: campo('tipo').value,
      descripcion: campo('descripcion').value,
      resultado: campo('resultado').value,
      vence: campo('vence').value,
      responsableCorreo: campo('responsable').value,
    };
    const editando = actividadEnEdicion !== null;
    const aplicado = ejecutar(
      () => (editando ? servicioActividades.actualizarActividad(actividadEnEdicion, datos) : servicioActividades.registrarActividad(datos)),
      editando ? 'Actividad actualizada correctamente' : (datos.tipo === 'tarea' ? 'Tarea creada correctamente' : 'Actividad registrada correctamente'),
    );
    if (!aplicado) return;
    cerrarFormulario();
    pintar();
    ficha.refrescar();
    refrescarAlertas();
  };

  // --- Cuadrículas ------------------------------------------------------------------------------------------
  const botonEditar = (id) => (puede('seguimiento', 'editar') ? repetir(documento, 'boton-editar', [{ id }]) : '');
  const botonEliminar = (id) => (puede('seguimiento', 'eliminar') ? repetir(documento, 'boton-eliminar', [{ id }]) : '');
  const botonCompletar = (actividad) => (servicioActividades.esPendiente(actividad) && puede('seguimiento', 'editar')
    ? repetir(documento, 'boton-completar', [{ id: actividad.id }]) : '');

  const tareas = montarCuadricula(buscar('#cuadricula-tareas', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Tareas pendientes',
    vacio: 'No tienes tareas pendientes.',
    columnas: [
      { clave: 'vence', titulo: 'Fecha', ancho: '110px' },
      { clave: 'cliente', titulo: 'Cliente', ancho: 'minmax(0, 1fr)' },
      { clave: 'descripcion', titulo: 'Tarea', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'responsable', titulo: 'Responsable', ancho: '120px' },
      { clave: 'estado', titulo: 'Estado', ancho: '96px', html: (fila) => repetir(documento, 'estado-tarea', [fila.insignia]) },
      { clave: 'acciones', titulo: 'Acciones', ancho: '370px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: [],
  });

  const historial = montarCuadricula(buscar('#cuadricula-actividades', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Historial de actividades',
    vacio: 'Aún no hay actividades registradas.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '84px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '130px' },
      { clave: 'cliente', titulo: 'Cliente', ancho: 'minmax(0, 1fr)' },
      { clave: 'tipo', titulo: 'Tipo', ancho: '96px' },
      { clave: 'descripcion', titulo: 'Descripción', ancho: 'minmax(0, 2fr)' },
      { clave: 'responsable', titulo: 'Responsable', ancho: '120px' },
      { clave: 'estado', titulo: 'Estado', ancho: '100px' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '250px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: [],
  });

  function pintar() {
    const pendientes = servicioActividades.tareasPendientes();
    const esPropietario = estado.roles.find((rol) => rol.id === usuarioActual()?.rolId)?.protegido;
    buscar('#alcance-tareas', raiz).textContent = esPropietario ? 'Ves las tareas de todas las personas.' : 'Ves solo las tareas asignadas a ti.';
    tareas.actualizar(pendientes.map((tarea) => ({
      vence: aFecha(tarea.vence.slice(0, 10)),
      cliente: nombreCliente(tarea.clienteId),
      descripcion: tarea.descripcion,
      responsable: tarea.responsable,
      insignia: estadoDe(tarea),
      estado: estadoDe(tarea).texto,
      acciones: repetir(documento, 'acciones-tarea', [{ id: tarea.id, editar: botonEditar(tarea.id), eliminar: botonEliminar(tarea.id), completar: botonCompletar(tarea) }]),
    })));
    historial.actualizar(estado.actividades.slice().reverse().map((actividad) => ({
      id: actividad.id,
      fecha: aFecha(actividad.fecha),
      cliente: nombreCliente(actividad.clienteId),
      tipo: servicioActividades.TIPOS_ACTIVIDAD[actividad.tipo],
      descripcion: actividad.descripcion + (actividad.resultado ? ` · ${actividad.resultado}` : ''),
      responsable: actividad.responsable,
      estado: estadoDe(actividad).texto,
      acciones: repetir(documento, 'acciones-actividad', [{ id: actividad.id, editar: botonEditar(actividad.id), eliminar: botonEliminar(actividad.id) }]),
    })));
  }

  // --- Ficha de la actividad --------------------------------------------------------------------------------
  const abrirFicha = (id) => ficha.abrir(id, () => {
    const actividad = buscarActividad(id);
    if (!actividad) return null;
    return {
      etiqueta: `Ficha de ${servicioActividades.TIPOS_ACTIVIDAD[actividad.tipo].toLowerCase()}`,
      titulo: `${actividad.id} · ${nombreCliente(actividad.clienteId)}`,
      subtitulo: `${servicioActividades.TIPOS_ACTIVIDAD[actividad.tipo]} · ${estadoDe(actividad).texto}`,
      datos: [
        { etiqueta: 'Cliente', valor: repetir(documento, 'enlace-cliente', [{ id: actividad.clienteId, nombre: nombreCliente(actividad.clienteId) }]), html: true },
        { etiqueta: 'Registrada', valor: aFecha(actividad.fecha) },
        { etiqueta: 'Responsable', valor: actividad.responsable },
        { etiqueta: 'Fecha de la tarea', valor: actividad.vence ? aFecha(actividad.vence.slice(0, 10)) : '' },
        { etiqueta: 'Hecha el', valor: actividad.completadaEn ? aFecha(actividad.completadaEn) : '' },
        { etiqueta: 'Descripción', valor: actividad.descripcion, ancho: true },
        { etiqueta: 'Resultado', valor: actividad.resultado ?? '', ancho: true },
      ],
      acciones: botonCompletar(actividad),
      alEditar: puede('seguimiento', 'editar') ? () => abrirFormulario(buscarActividad(id)) : null,
    };
  });

  // --- Acciones de las filas y de la ficha ------------------------------------------------------------------
  let actividadPorEliminar = null;
  const confirmar = buscar('#confirmar-eliminar-actividad', raiz);
  const pedirEliminar = (actividad) => {
    actividadPorEliminar = actividad.id;
    buscar('#texto-eliminar-actividad', raiz).textContent = `¿Eliminar ${actividad.id} · ${actividad.descripcion}?`;
    confirmar.hidden = false;
    confirmar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    buscar('#eliminar-actividad-no', raiz).focus();
  };
  buscar('#eliminar-actividad-no', raiz).onclick = () => { confirmar.hidden = true; };
  buscar('#eliminar-actividad-si', raiz).onclick = () => {
    if (ejecutar(() => servicioActividades.eliminarActividad(actividadPorEliminar), 'Actividad eliminada correctamente')) {
      if (ficha.idAbierto() === actividadPorEliminar) ficha.cerrar();
      pintar();
      refrescarAlertas();
    }
    confirmar.hidden = true;
  };

  const alTocar = (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    if (boton.dataset.ficha) abrirFicha(boton.dataset.ficha);
    else if (boton.dataset.editar) abrirFormulario(buscarActividad(boton.dataset.editar));
    else if (boton.dataset.eliminar) pedirEliminar(buscarActividad(boton.dataset.eliminar));
    else if (boton.dataset.completar && ejecutar(() => servicioActividades.completarTarea(boton.dataset.completar), 'Tarea marcada como hecha correctamente')) {
      pintar();
      ficha.refrescar();
      refrescarAlertas();
    }
  };
  ['#cuadricula-tareas', '#cuadricula-actividades', '#ficha-actividad'].forEach((selector) => buscar(selector, raiz).addEventListener('click', alTocar));

  pintar();
}
