// Carga perezosa: cada módulo se descarga solo cuando se visita
export const rutas = {
  panel: () => import('../modules/panel/panel.js'),
  'nueva-venta': () => import('../modules/nueva-venta/nueva-venta.js'),
  ventas: () => import('../modules/ventas/ventas.js'),
  ajustes: () => import('../modules/ajustes/ajustes.js'),
  clientes: () => import('../modules/clientes/clientes.js'),
  caja: () => import('../modules/caja/caja.js'),
  pagos: () => import('../modules/pagos/pagos.js'),
  reportes: () => import('../modules/reportes/reportes.js'),
  roles: () => import('../modules/roles/roles.js'),
  inventario: () => import('../modules/inventario/inventario.js'),
  placeholder: () => import('../modules/placeholder/placeholder.js'),
};
