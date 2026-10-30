// Permisos por módulo. Cada módulo del menú admite solo algunas acciones; el rol Propietario las tiene todas.
import { MENU } from './nav.js';

export const ID_ROL_PROPIETARIO = 'propietario';

export const ACCIONES = [
  { id: 'ver', etiqueta: 'Ver' },
  { id: 'crear', etiqueta: 'Crear' },
  { id: 'editar', etiqueta: 'Editar' },
  { id: 'eliminar', etiqueta: 'Eliminar' },
];

const TODAS_LAS_ACCIONES = ACCIONES.map((accion) => accion.id);

// Módulos que no admiten todas las acciones
const ACCIONES_POR_MODULO = {
  panel: ['ver'],
  'nueva-venta': ['ver', 'crear'],
  ventas: ['ver', 'eliminar'],
  reportes: ['ver'],
  ajustes: ['ver', 'editar'],
};

export const MODULOS_PERMISOS = MENU.map((opcion) => ({
  id: opcion.id,
  etiqueta: opcion.etiqueta,
  acciones: ACCIONES_POR_MODULO[opcion.id] ?? TODAS_LAS_ACCIONES,
}));

export const permisosCompletos = () =>
  Object.fromEntries(MODULOS_PERMISOS.map((modulo) => [modulo.id, [...modulo.acciones]]));
