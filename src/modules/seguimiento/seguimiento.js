import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aFecha, fechaDeHoy } from '../../core/format.js';
import { puede, usuarioActual } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import * as servicioActividades from '../../services/actividades.service.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { refrescarAlertas } from '../../components/header/header.js';

let documento;
let plantillasCuadricula;

const opciones = (pares) => repetir(documento, 'opcion', pares.map(([valor, texto]) => ({ valor, texto })));
const nombreCliente = (id) => estado.clientes.find((cliente) => cliente.id === id)?.nombre ?? id;

export async function dibujar() {
  documento = await cargarHtml(new URL('./seguimiento.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  return seccion(documento, 'principal', {
    hoy: fechaDeHoy(),
    opcionesCliente: opciones(estado.clientes.map((cliente) => [cliente.id, `${cliente.nombre} · ${cliente.id}`])),
    opcionesActividad: opciones(Object.entries(servicioActividades.TIPOS_ACTIVIDAD)),
    opcionesResponsable: opciones(estado.usuarios.filter((usuario) => usuario.activo).map((usuario) => [usuario.correo, usuario.nombre])),
  });
}

export function montar(raiz, contexto) {
  const tipo = buscar('#actividad-tipo', raiz);
  buscar('#formulario-actividad', raiz).hidden = !puede('seguimiento', 'crear');
  buscar('#actividad-responsable', raiz).value = usuarioActual()?.correo ?? '';
  tipo.onchange = () => { buscar('#campos-tarea', raiz).hidden = tipo.value !== 'tarea'; };

  const estadoDe = (actividad) => {
    if (!servicioActividades.esPendiente(actividad)) return { texto: actividad.tipo === 'tarea' ? 'Hecha' : 'Registrada', clase: 'suave' };
    return servicioActividades.estaVencidaTarea(actividad) ? { texto: 'Vencida', clase: '' } : { texto: 'Pendiente', clase: 'suave' };
  };

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
      { clave: 'acciones', titulo: 'Acciones', ancho: '200px', filtrable: false, html: (fila) => fila.acciones },
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
    ],
    filas: [],
  });

  const pintar = () => {
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
      acciones: repetir(documento, 'acciones-tarea', [{
        clienteId: tarea.clienteId,
        completar: puede('seguimiento', 'editar') ? repetir(documento, 'boton-completar', [{ id: tarea.id }]) : '',
      }]),
    })));
    historial.actualizar(estado.actividades.slice().reverse().map((actividad) => ({
      id: actividad.id,
      fecha: aFecha(actividad.fecha),
      cliente: nombreCliente(actividad.clienteId),
      tipo: servicioActividades.TIPOS_ACTIVIDAD[actividad.tipo],
      descripcion: actividad.descripcion + (actividad.resultado ? ` · ${actividad.resultado}` : ''),
      responsable: actividad.responsable,
      estado: estadoDe(actividad).texto,
    })));
  };

  buscar('#registrar-actividad', raiz).onclick = () => {
    try {
      servicioActividades.registrarActividad({
        clienteId: buscar('#actividad-cliente', raiz).value,
        tipo: tipo.value,
        descripcion: buscar('#actividad-descripcion', raiz).value,
        vence: buscar('#actividad-vence', raiz).value,
        responsableCorreo: buscar('#actividad-responsable', raiz).value,
      });
      contexto.aviso(tipo.value === 'tarea' ? 'Tarea creada correctamente' : 'Actividad registrada correctamente');
      buscar('#actividad-descripcion', raiz).value = '';
      pintar();
      refrescarAlertas();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  buscar('#cuadricula-tareas', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-completar]');
    if (!boton) return;
    try {
      servicioActividades.completarTarea(boton.dataset.completar);
      contexto.aviso('Tarea marcada como hecha correctamente');
      pintar();
      refrescarAlertas();
    } catch (error) {
      contexto.alerta(error.message);
    }
  });

  pintar();
}
