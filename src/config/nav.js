// Menú lateral (cada opción abre su propia página). Para agregar un módulo: una entrada aquí,
// una ruta en routes.js y una página <id>.html. "Cerrar sesión" va siempre al final y la agrega el menú lateral.
export const MENU = [
  {
    id: 'panel',
    etiqueta: 'Panel',
    icono: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  },
  {
    id: 'nueva-venta',
    etiqueta: 'Registrar venta',
    icono: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  },
  {
    id: 'ventas',
    etiqueta: 'Ventas',
    icono: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  },
  {
    id: 'clientes',
    etiqueta: 'Clientes',
    icono: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  },
  {
    id: 'seguimiento',
    etiqueta: 'Seguimiento',
    icono: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16M8 14l2 2 4-4"/>',
  },
  {
    id: 'embudo',
    etiqueta: 'Embudo',
    icono: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  },
  {
    id: 'inventario',
    etiqueta: 'Inventario',
    icono: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  },
  {
    id: 'proveedores',
    etiqueta: 'Proveedores',
    icono: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  },
  {
    id: 'caja',
    etiqueta: 'Caja',
    icono: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>',
  },
  {
    id: 'contabilidad',
    etiqueta: 'Contabilidad',
    icono: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2M16 12v4"/>',
  },
  {
    id: 'pagos',
    etiqueta: 'Pagos',
    icono: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  },
  {
    id: 'reportes',
    etiqueta: 'Reportes',
    icono: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  },
  {
    id: 'auditoria',
    etiqueta: 'Auditoría',
    icono: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  },
  {
    id: 'roles',
    etiqueta: 'Roles y permisos',
    abajo: true,
    icono: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  },
  {
    id: 'ajustes',
    etiqueta: 'Ajustes',
    abajo: true,
    icono: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  },
];
