// Carga perezosa: cada módulo se descarga solo cuando se visita
export const rutas = {
  panel: () => import('../modules/panel/panel.js'),
  'nueva-venta': () => import('../modules/nueva-venta/nueva-venta.js'),
  ventas: () => import('../modules/ventas/ventas.js'),
  inventario: () => import('../modules/inventario/inventario.js'),
  placeholder: () => import('../modules/placeholder/placeholder.js'),
};
