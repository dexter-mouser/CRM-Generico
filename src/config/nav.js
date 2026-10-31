// Navegación. Cada módulo es una página propia (<id>.html) con su permiso; los módulos se agrupan en 6 grupos
// que se ven siempre en el menú. El grupo abierto muestra sus secciones debajo y como pestañas en la página.
// Para agregar un módulo: una entrada en MENU, su sección en GRUPOS, una ruta en routes.js y una página <id>.html.
// "Cerrar sesión" va siempre al final y la agrega el menú lateral.

// Módulos (uno por página y por permiso). Roles y permisos se arma con esta lista.
export const MENU = [
  { id: 'panel', etiqueta: 'Panel' },
  { id: 'reportes', etiqueta: 'Reportes' },
  { id: 'nueva-venta', etiqueta: 'Registrar venta' },
  { id: 'ventas', etiqueta: 'Ventas' },
  { id: 'caja', etiqueta: 'Caja' },
  { id: 'clientes', etiqueta: 'Clientes' },
  { id: 'seguimiento', etiqueta: 'Seguimiento' },
  { id: 'embudo', etiqueta: 'Embudo' },
  { id: 'inventario', etiqueta: 'Inventario' },
  { id: 'bodegas', etiqueta: 'Bodegas' },
  { id: 'proveedores', etiqueta: 'Proveedores' },
  { id: 'contabilidad', etiqueta: 'Contabilidad' },
  { id: 'pagos', etiqueta: 'Pagos' },
  { id: 'tiendas', etiqueta: 'Tiendas' },
  { id: 'empleados', etiqueta: 'Empleados' },
  { id: 'roles', etiqueta: 'Roles y permisos' },
  { id: 'auditoria', etiqueta: 'Auditoría' },
  { id: 'ajustes', etiqueta: 'Ajustes' },
];

// Grupos del menú. Cada sección abre un módulo; "seccion" muestra solo esa parte de la página (?seccion=...).
export const GRUPOS = [
  {
    id: 'inicio',
    etiqueta: 'Inicio',
    icono: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    secciones: [
      { etiqueta: 'Panel', modulo: 'panel' },
      { etiqueta: 'Reportes', modulo: 'reportes' },
    ],
  },
  {
    id: 'ventas',
    etiqueta: 'Ventas',
    icono: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    secciones: [
      { etiqueta: 'Registrar venta', modulo: 'nueva-venta' },
      { etiqueta: 'Facturas', modulo: 'ventas', seccion: 'facturas' },
      { etiqueta: 'Remisiones y cotizaciones', modulo: 'ventas', seccion: 'documentos' },
      { etiqueta: 'Notas', modulo: 'ventas', seccion: 'notas' },
      { etiqueta: 'Caja', modulo: 'caja' },
    ],
  },
  {
    id: 'clientes',
    etiqueta: 'Clientes',
    icono: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    secciones: [
      { etiqueta: 'Clientes', modulo: 'clientes' },
      { etiqueta: 'Seguimiento', modulo: 'seguimiento' },
      { etiqueta: 'Embudo', modulo: 'embudo' },
    ],
  },
  {
    id: 'inventario',
    etiqueta: 'Inventario',
    icono: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    secciones: [
      { etiqueta: 'Productos', modulo: 'inventario', seccion: 'productos' },
      { etiqueta: 'Kardex', modulo: 'inventario', seccion: 'kardex' },
      { etiqueta: 'Compras', modulo: 'inventario', seccion: 'compras' },
      { etiqueta: 'Bodegas', modulo: 'bodegas' },
      { etiqueta: 'Proveedores', modulo: 'proveedores' },
    ],
  },
  {
    id: 'finanzas',
    etiqueta: 'Finanzas',
    icono: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2M16 12v4"/>',
    secciones: [
      { etiqueta: 'Contabilidad', modulo: 'contabilidad' },
      { etiqueta: 'Abonos de clientes', modulo: 'pagos', seccion: 'abonos' },
      { etiqueta: 'Pagos a proveedores', modulo: 'pagos', seccion: 'proveedores' },
    ],
  },
  {
    id: 'administracion',
    etiqueta: 'Administración',
    corta: 'Admin',
    abajo: true,
    icono: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    secciones: [
      { etiqueta: 'Tiendas', modulo: 'tiendas' },
      { etiqueta: 'Empleados', modulo: 'empleados' },
      { etiqueta: 'Roles y permisos', modulo: 'roles' },
      { etiqueta: 'Auditoría', modulo: 'auditoria' },
      { etiqueta: 'Ajustes', modulo: 'ajustes' },
    ],
  },
];

// Accesos principales del Inicio: lo que más se usa, a un clic
export const ACCESOS_PRINCIPALES = [
  { etiqueta: 'Registrar venta', detalle: 'Factura, remisión o cotización', modulo: 'nueva-venta', permiso: 'crear', enlace: 'nueva-venta.html',
    icono: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' },
  { etiqueta: 'Nueva cotización', detalle: 'Entra al embudo', modulo: 'nueva-venta', permiso: 'crear', enlace: 'nueva-venta.html?tipo=cotizacion',
    icono: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>' },
  { etiqueta: 'Nuevo cliente', detalle: 'Ficha con documento y cupo', modulo: 'clientes', permiso: 'crear', enlace: 'clientes.html?nuevo=1',
    icono: '<circle cx="10" cy="8" r="4"/><path d="M3 21c0-4 3-6 7-6M17 14v6M14 17h6"/>' },
  { etiqueta: 'Caja', detalle: 'Abrir, movimientos y cierre', modulo: 'caja', permiso: 'ver', enlace: 'caja.html',
    icono: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>' },
  { etiqueta: 'Ingresar compra', detalle: 'Factura del proveedor', modulo: 'inventario', permiso: 'crear', enlace: 'inventario.html?seccion=compras',
    icono: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M12 8v6M9 11h6"/>' },
  { etiqueta: 'Registrar abono', detalle: 'Cliente con deuda', modulo: 'pagos', permiso: 'crear', enlace: 'pagos.html?seccion=abonos',
    icono: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>' },
];

export const enlaceDeSeccion = (seccion) => `${seccion.modulo}.html${seccion.seccion ? `?seccion=${seccion.seccion}` : ''}`;

// Grupo al que pertenece un módulo
export const grupoDeModulo = (modulo) => GRUPOS.find((grupo) => grupo.secciones.some((seccion) => seccion.modulo === modulo));
