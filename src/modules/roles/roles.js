import { buscar, buscarTodos } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { ACCIONES, MODULOS_PERMISOS } from '../../config/permisos.js';
import * as servicioRoles from '../../services/roles.service.js';

let documento;
let rolSeleccionadoId = null;

const contarPersonas = (rolId) => {
  const cantidad = servicioRoles.miembrosDeRol(rolId);
  return cantidad === 1 ? '1 persona' : `${cantidad} personas`;
};

export async function dibujar() {
  documento = await cargarHtml(new URL('./roles.html', import.meta.url));
  if (!servicioRoles.buscarRol(rolSeleccionadoId)) rolSeleccionadoId = estado.roles[0].id;
  return seccion(documento, 'principal', {
    roles: '',
    encabezados: repetir(documento, 'encabezado-accion', ACCIONES),
  });
}

export function montar(raiz, contexto) {
  let modoFormulario = null; // 'crear' o 'editar'
  const rolActual = () => servicioRoles.buscarRol(rolSeleccionadoId);

  // Ejecuta un cambio y muestra el aviso; devuelve si se pudo aplicar
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

  const opcionesDeRoles = (seleccionadoId) => repetir(documento, 'opcion-rol', estado.roles.map((rol) => ({
    id: rol.id,
    nombre: rol.nombre,
    seleccion: rol.id === seleccionadoId ? 'selected' : '',
  })));

  const pintarRoles = () => {
    buscar('#lista-roles', raiz).innerHTML = repetir(documento, 'tarjeta-rol', estado.roles.map((rol) => ({
      id: rol.id,
      nombre: rol.nombre,
      actual: String(rol.id === rolSeleccionadoId),
      insignia: rol.protegido ? documento.querySelector('#insignia-protegido').innerHTML : '',
      personas: contarPersonas(rol.id),
    })));
  };

  const pintarDetalle = () => {
    const rol = rolActual();
    buscar('#rol-titulo', raiz).textContent = rol.nombre;
    buscar('#rol-descripcion-actual', raiz).textContent = rol.descripcion || 'Sin descripción';
    buscar('#editar-rol', raiz).disabled = rol.protegido;
    buscar('#eliminar-rol', raiz).disabled = rol.protegido;
    buscar('#confirmar-eliminar-rol', raiz).hidden = true;

    buscar('#matriz-permisos', raiz).innerHTML = repetir(documento, 'fila-permiso', MODULOS_PERMISOS.map((modulo) => ({
      modulo: modulo.etiqueta,
      celdas: ACCIONES.map((accion) => {
        if (!modulo.acciones.includes(accion.id)) return documento.querySelector('#celda-vacia').innerHTML;
        const marcada = (rol.permisos[modulo.id] ?? []).includes(accion.id);
        return repetir(documento, 'celda-permiso', [{
          modulo: modulo.id,
          accion: accion.id,
          descripcion: `${accion.etiqueta} en ${modulo.etiqueta}`,
          estado: `${marcada ? 'checked' : ''} ${rol.protegido ? 'disabled' : ''}`,
        }]);
      }).join(''),
    })));
  };

  const pintarPersonas = () => {
    buscar('#lista-personas', raiz).innerHTML = repetir(documento, 'fila-persona', estado.usuarios.map((usuario) => ({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      opciones: opcionesDeRoles(usuario.rolId),
      marcado: usuario.activo ? 'checked' : '',
    })));
    buscar('#persona-rol', raiz).innerHTML = opcionesDeRoles(rolSeleccionadoId);
  };

  const pintarTodo = () => {
    pintarRoles();
    pintarDetalle();
    pintarPersonas();
  };

  // Formulario de rol (crear o editar)
  const abrirFormularioRol = (modo) => {
    modoFormulario = modo;
    const rol = rolActual();
    buscar('#titulo-formulario-rol', raiz).textContent = modo === 'crear' ? 'Nuevo rol' : `Editar rol ${rol.nombre}`;
    buscar('#rol-nombre', raiz).value = modo === 'crear' ? '' : rol.nombre;
    buscar('#rol-descripcion', raiz).value = modo === 'crear' ? '' : rol.descripcion;
    buscar('#formulario-rol', raiz).hidden = false;
    buscar('#rol-nombre', raiz).focus();
  };
  const cerrarFormularioRol = () => {
    modoFormulario = null;
    buscar('#formulario-rol', raiz).hidden = true;
  };

  buscar('#nuevo-rol', raiz).onclick = () => abrirFormularioRol('crear');
  buscar('#editar-rol', raiz).onclick = () => abrirFormularioRol('editar');
  buscar('#cancelar-rol', raiz).onclick = cerrarFormularioRol;
  buscar('#guardar-rol', raiz).onclick = () => {
    const datos = { nombre: buscar('#rol-nombre', raiz).value, descripcion: buscar('#rol-descripcion', raiz).value };
    const creando = modoFormulario === 'crear';
    const aplicado = ejecutar(() => {
      if (creando) rolSeleccionadoId = servicioRoles.crearRol(datos).id;
      else servicioRoles.actualizarRol(rolSeleccionadoId, datos);
    }, creando ? 'Rol creado correctamente' : 'Rol actualizado correctamente');
    if (!aplicado) return;
    cerrarFormularioRol();
    pintarTodo();
  };

  // Elegir un rol de la lista
  buscar('#lista-roles', raiz).addEventListener('click', (evento) => {
    const tarjeta = evento.target.closest('[data-rol]');
    if (!tarjeta) return;
    rolSeleccionadoId = tarjeta.dataset.rol;
    if (modoFormulario === 'editar') cerrarFormularioRol();
    pintarTodo();
  });

  // Eliminar un rol, con confirmación
  buscar('#eliminar-rol', raiz).onclick = () => {
    buscar('#texto-eliminar-rol', raiz).textContent = `¿Eliminar el rol ${rolActual().nombre}?`;
    buscar('#confirmar-eliminar-rol', raiz).hidden = false;
    buscar('#eliminar-rol-no', raiz).focus();
  };
  buscar('#eliminar-rol-no', raiz).onclick = () => { buscar('#confirmar-eliminar-rol', raiz).hidden = true; };
  buscar('#eliminar-rol-si', raiz).onclick = () => {
    const aplicado = ejecutar(() => servicioRoles.eliminarRol(rolSeleccionadoId), 'Rol eliminado correctamente');
    if (!aplicado) {
      buscar('#confirmar-eliminar-rol', raiz).hidden = true;
      return;
    }
    rolSeleccionadoId = estado.roles[0].id;
    pintarTodo();
  };

  // Permisos: cada casilla se aplica al marcarla
  buscar('#matriz-permisos', raiz).addEventListener('change', (evento) => {
    const casilla = evento.target.closest('[data-modulo]');
    if (!casilla) return;
    const aplicado = ejecutar(
      () => servicioRoles.establecerPermiso(rolSeleccionadoId, casilla.dataset.modulo, casilla.dataset.accion, casilla.checked),
      'Permisos actualizados correctamente',
    );
    if (!aplicado) casilla.checked = !casilla.checked;
    pintarDetalle();
  });

  // Personas
  const lista = buscar('#lista-personas', raiz);
  lista.addEventListener('change', (evento) => {
    const selector = evento.target.closest('[data-persona]');
    const interruptor = evento.target.closest('[data-activo]');
    if (selector) {
      ejecutar(() => servicioRoles.cambiarRolUsuario(selector.dataset.persona, selector.value), 'Rol de la persona cambiado correctamente');
    } else if (interruptor) {
      ejecutar(() => servicioRoles.cambiarEstadoUsuario(interruptor.dataset.activo, interruptor.checked), 'Estado de la persona actualizado correctamente');
    } else return;
    pintarTodo();
  });

  const formularioPersona = buscar('#formulario-persona', raiz);
  buscar('#agregar-persona', raiz).onclick = () => {
    formularioPersona.hidden = false;
    buscar('#persona-nombre', raiz).focus();
  };
  buscar('#cancelar-persona', raiz).onclick = () => { formularioPersona.hidden = true; };
  buscar('#guardar-persona', raiz).onclick = () => {
    const aplicado = ejecutar(() => servicioRoles.agregarUsuario({
      nombre: buscar('#persona-nombre', raiz).value,
      correo: buscar('#persona-correo', raiz).value,
      rolId: buscar('#persona-rol', raiz).value,
    }), 'Persona agregada correctamente');
    if (!aplicado) return;
    buscarTodos('#persona-nombre, #persona-correo', raiz).forEach((campo) => { campo.value = ''; });
    formularioPersona.hidden = true;
    pintarTodo();
  };

  pintarTodo();
}
