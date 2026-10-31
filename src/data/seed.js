// Datos de ejemplo de una tienda de mascotas. Luego se reemplazan por llamadas a la API.
import { ID_ROL_PROPIETARIO, permisosCompletos } from '../config/permisos.js';

// Fecha de "hace N días" a la hora indicada (nunca en el futuro); los minutos separan registros de la misma hora
const hace = (dias, hora, minutos = 0) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  fecha.setHours(hora, minutos, 0, 0);
  return new Date(Math.min(fecha.getTime(), Date.now() - 60000)).toISOString();
};

// Fecha de "dentro de N días" a la hora indicada (para tareas y vigencias futuras)
const dentroDe = (dias, hora = 9) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  fecha.setHours(hora, 0, 0, 0);
  return fecha.toISOString();
};

const semilla = {
  version: 6,
  productos: [
    { id: '1', referencia: 'DC-AD-4', nombre: 'Dog Chow adulto razas medianas 4 kg', categoria: 'Alimento', costo: 52000, precio: 68000, iva: 5, stockMinimo: 5, existencias: 14 },
    { id: '2', referencia: 'PD-CA-2', nombre: 'Pedigree cachorro 2 kg', categoria: 'Alimento', costo: 24000, precio: 31500, iva: 5, stockMinimo: 5, existencias: 9 },
    { id: '3', referencia: 'CC-AD-15', nombre: 'Cat Chow gatos adultos 1,5 kg', categoria: 'Alimento', costo: 21000, precio: 28000, iva: 5, stockMinimo: 5, existencias: 12 },
    { id: '4', referencia: 'WH-SO-85', nombre: 'Whiskas pescado sobre 85 g', categoria: 'Alimento', costo: 1800, precio: 2600, iva: 5, stockMinimo: 5, existencias: 65 },
    { id: '5', referencia: 'AR-GA-10', nombre: 'Arena sanitaria para gatos 10 kg', categoria: 'Higiene', costo: 19000, precio: 26000, iva: 19, stockMinimo: 5, existencias: 4 },
    { id: '6', referencia: 'CO-AJ-M', nombre: 'Collar ajustable talla M', categoria: 'Accesorios', costo: 6500, precio: 12000, iva: 19, stockMinimo: 5, existencias: 19 },
    { id: '7', referencia: 'CR-NY-15', nombre: 'Correa de nylon 1,5 m', categoria: 'Accesorios', costo: 8000, precio: 15000, iva: 19, stockMinimo: 5, existencias: 11 },
    { id: '8', referencia: 'PE-CA-01', nombre: 'Pelota de caucho', categoria: 'Juguetes', costo: 2500, precio: 6000, iva: 19, stockMinimo: 5, existencias: 25 },
    { id: '9', referencia: 'HU-CU-M', nombre: 'Hueso de cuero prensado mediano', categoria: 'Juguetes', costo: 3000, precio: 7000, iva: 19, stockMinimo: 5, existencias: 30 },
    { id: '10', referencia: 'SH-AP-250', nombre: 'Shampoo antipulgas 250 ml', categoria: 'Higiene', costo: 11000, precio: 18500, iva: 19, stockMinimo: 5, existencias: 7 },
    { id: '11', referencia: 'AP-PI-M', nombre: 'Antipulgas pipeta perro mediano', categoria: 'Higiene', costo: 17000, precio: 26000, iva: 19, stockMinimo: 5, existencias: 2 },
    { id: '12', referencia: 'CA-PE-M', nombre: 'Cama para perro mediana', categoria: 'Accesorios', costo: 38000, precio: 59000, iva: 19, stockMinimo: 5, existencias: 4 },
    { id: '13', referencia: 'CM-AC-01', nombre: 'Comedero de acero inoxidable', categoria: 'Accesorios', costo: 7500, precio: 14000, iva: 19, stockMinimo: 5, existencias: 16 },
    { id: '14', referencia: 'AL-PE-50', nombre: 'Alimento para peces en hojuelas 50 g', categoria: 'Alimento', costo: 3500, precio: 7500, iva: 5, stockMinimo: 5, existencias: 20 },
    { id: '15', referencia: 'JA-HA-01', nombre: 'Jaula para hámster', categoria: 'Accesorios', costo: 42000, precio: 65000, iva: 19, stockMinimo: 5, existencias: 4 },
    { id: '16', referencia: 'RA-GA-01', nombre: 'Rascador para gatos', categoria: 'Accesorios', costo: 28000, precio: 45000, iva: 19, stockMinimo: 5, existencias: 5 },
    { id: '17', referencia: 'SN-DE-07', nombre: 'Snack dental para perro x 7', categoria: 'Alimento', costo: 9500, precio: 16000, iva: 5, stockMinimo: 5, existencias: 22 },
    { id: '18', referencia: 'TR-ME-01', nombre: 'Transportadora mediana', categoria: 'Accesorios', costo: 45000, precio: 72000, iva: 19, stockMinimo: 5, existencias: 6 },
  ],
  ventas: [
    {
      id: 'F1', fecha: hace(6, 9, 1), usuario: 'Administrador', cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 29600,
      items: [
        { productoId: '4', nombre: 'Whiskas pescado sobre 85 g', cantidad: 6, valorUnitario: 2600 },
        { productoId: '9', nombre: 'Hueso de cuero prensado mediano', cantidad: 2, valorUnitario: 7000 }
      ],
    },
    {
      id: 'F2', fecha: hace(6, 11, 2), usuario: 'Administrador', cliente: 'Laura Martínez', clienteId: 'C-001', metodo: 'Nequi', total: 100000,
      items: [
        { productoId: '1', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 1, valorUnitario: 68000 },
        { productoId: '17', nombre: 'Snack dental para perro x 7', cantidad: 2, valorUnitario: 16000 }
      ],
    },
    {
      id: 'F3', fecha: hace(6, 16, 3), usuario: 'Camila Duarte', cliente: 'Veterinaria Patitas', clienteId: 'C-008', metodo: 'Crédito', plazoDias: 30, total: 215000,
      items: [
        { productoId: '10', nombre: 'Shampoo antipulgas 250 ml', cantidad: 4, valorUnitario: 18500 },
        { productoId: '11', nombre: 'Antipulgas pipeta perro mediano', cantidad: 3, valorUnitario: 26000 },
        { productoId: '2', nombre: 'Pedigree cachorro 2 kg', cantidad: 2, valorUnitario: 31500 }
      ],
    },
    {
      id: 'F4', fecha: hace(5, 10, 4), usuario: 'Administrador', cliente: 'Carlos Rodríguez', clienteId: 'C-002', metodo: 'Tarjeta', total: 87000,
      items: [
        { productoId: '12', nombre: 'Cama para perro mediana', cantidad: 1, valorUnitario: 59000 },
        { productoId: '13', nombre: 'Comedero de acero inoxidable', cantidad: 2, valorUnitario: 14000 }
      ],
    },
    {
      id: 'F5', fecha: hace(5, 15, 5), usuario: 'Administrador', cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 30000,
      items: [
        { productoId: '8', nombre: 'Pelota de caucho', cantidad: 3, valorUnitario: 6000 },
        { productoId: '6', nombre: 'Collar ajustable talla M', cantidad: 1, valorUnitario: 12000 }
      ],
    },
    {
      id: 'F6', fecha: hace(4, 9, 6), usuario: 'Camila Duarte', cliente: 'Valentina Gómez', clienteId: 'C-003', metodo: 'Crédito', plazoDias: 30, total: 82000,
      items: [
        { productoId: '3', nombre: 'Cat Chow gatos adultos 1,5 kg', cantidad: 2, valorUnitario: 28000 },
        { productoId: '5', nombre: 'Arena sanitaria para gatos 10 kg', cantidad: 1, valorUnitario: 26000 }
      ],
    },
    {
      id: 'F7', fecha: hace(4, 17, 7), usuario: 'Administrador', cliente: 'Mariana Ospina', clienteId: 'C-005', metodo: 'Transferencia', total: 80000,
      items: [
        { productoId: '15', nombre: 'Jaula para hámster', cantidad: 1, valorUnitario: 65000 },
        { productoId: '14', nombre: 'Alimento para peces en hojuelas 50 g', cantidad: 2, valorUnitario: 7500 }
      ],
    },
    {
      id: 'F8', fecha: hace(3, 12, 8), usuario: 'Administrador', cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 78400,
      items: [
        { productoId: '1', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 1, valorUnitario: 68000 },
        { productoId: '4', nombre: 'Whiskas pescado sobre 85 g', cantidad: 4, valorUnitario: 2600 }
      ],
    },
    {
      id: 'F9', fecha: hace(3, 18, 9), usuario: 'Camila Duarte', cliente: 'Andrés Herrera', clienteId: 'C-004', metodo: 'Nequi', total: 48000,
      items: [
        { productoId: '7', nombre: 'Correa de nylon 1,5 m', cantidad: 1, valorUnitario: 15000 },
        { productoId: '6', nombre: 'Collar ajustable talla M', cantidad: 1, valorUnitario: 12000 },
        { productoId: '9', nombre: 'Hueso de cuero prensado mediano', cantidad: 3, valorUnitario: 7000 }
      ],
    },
    {
      id: 'F10', fecha: hace(2, 10, 10), usuario: 'Administrador', cliente: 'Juan Pablo Cardona', clienteId: 'C-006', metodo: 'Efectivo', total: 71000,
      items: [
        { productoId: '16', nombre: 'Rascador para gatos', cantidad: 1, valorUnitario: 45000 },
        { productoId: '5', nombre: 'Arena sanitaria para gatos 10 kg', cantidad: 1, valorUnitario: 26000 }
      ],
    },
    {
      id: 'F11', fecha: hace(2, 14, 11), usuario: 'Administrador', cliente: 'Sofía Restrepo', clienteId: 'C-007', metodo: 'Tarjeta', total: 120000,
      items: [
        { productoId: '18', nombre: 'Transportadora mediana', cantidad: 1, valorUnitario: 72000 },
        { productoId: '17', nombre: 'Snack dental para perro x 7', cantidad: 3, valorUnitario: 16000 }
      ],
    },
    {
      id: 'F12', fecha: hace(1, 9, 12), usuario: 'Camila Duarte', cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 75000,
      items: [
        { productoId: '2', nombre: 'Pedigree cachorro 2 kg', cantidad: 2, valorUnitario: 31500 },
        { productoId: '8', nombre: 'Pelota de caucho', cantidad: 2, valorUnitario: 6000 }
      ],
    },
    {
      id: 'F13', fecha: hace(1, 13, 13), usuario: 'Administrador', cliente: 'Carlos Rodríguez', clienteId: 'C-002', metodo: 'Nequi', total: 100500,
      items: [
        { productoId: '1', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 1, valorUnitario: 68000 },
        { productoId: '10', nombre: 'Shampoo antipulgas 250 ml', cantidad: 1, valorUnitario: 18500 },
        { productoId: '13', nombre: 'Comedero de acero inoxidable', cantidad: 1, valorUnitario: 14000 }
      ],
    },
    {
      id: 'F14', fecha: hace(1, 17, 14), usuario: 'Administrador', cliente: 'Valentina Gómez', clienteId: 'C-003', metodo: 'Crédito', plazoDias: 30, total: 74000,
      items: [
        { productoId: '12', nombre: 'Cama para perro mediana', cantidad: 1, valorUnitario: 59000 },
        { productoId: '7', nombre: 'Correa de nylon 1,5 m', cantidad: 1, valorUnitario: 15000 }
      ],
    },
    {
      id: 'F15', fecha: hace(0, 9, 15), usuario: 'Camila Duarte', cliente: 'Laura Martínez', clienteId: 'C-001', metodo: 'Efectivo', total: 29000,
      items: [
        { productoId: '4', nombre: 'Whiskas pescado sobre 85 g', cantidad: 5, valorUnitario: 2600 },
        { productoId: '17', nombre: 'Snack dental para perro x 7', cantidad: 1, valorUnitario: 16000 }
      ],
    },
    {
      id: 'F16', fecha: hace(0, 10, 16), usuario: 'Administrador', cliente: 'Cliente sin nombre', metodo: 'Nequi', total: 42000,
      items: [
        { productoId: '3', nombre: 'Cat Chow gatos adultos 1,5 kg', cantidad: 1, valorUnitario: 28000 },
        { productoId: '9', nombre: 'Hueso de cuero prensado mediano', cantidad: 2, valorUnitario: 7000 }
      ],
    },
  ],
  facturas: [
    {
      numero: 'F-2301', proveedorId: 'PV-001', proveedor: 'Distribuidora Pet del Valle', fecha: hace(9, 8).slice(0, 10), total: 1230000,
      items: [
        { productoId: '1', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 12, costoUnitario: 52000 },
        { productoId: '2', nombre: 'Pedigree cachorro 2 kg', cantidad: 10, costoUnitario: 24000 },
        { productoId: '3', nombre: 'Cat Chow gatos adultos 1,5 kg', cantidad: 12, costoUnitario: 21000 },
        { productoId: '5', nombre: 'Arena sanitaria para gatos 10 kg', cantidad: 6, costoUnitario: 19000 }
      ],
    },
    {
      numero: 'F-0877', proveedorId: 'PV-002', proveedor: 'Agrocampo Pet S.A.S.', fecha: hace(6, 8).slice(0, 10), total: 532000,
      items: [
        { productoId: '4', nombre: 'Whiskas pescado sobre 85 g', cantidad: 80, costoUnitario: 1800 },
        { productoId: '9', nombre: 'Hueso de cuero prensado mediano', cantidad: 30, costoUnitario: 3000 },
        { productoId: '17', nombre: 'Snack dental para perro x 7', cantidad: 24, costoUnitario: 9500 },
        { productoId: '14', nombre: 'Alimento para peces en hojuelas 50 g', cantidad: 20, costoUnitario: 3500 }
      ],
    },
    {
      numero: 'F-4410', proveedorId: 'PV-003', proveedor: 'Accesorios Canino Ltda.', fecha: hace(3, 8).slice(0, 10), total: 1022000,
      items: [
        { productoId: '6', nombre: 'Collar ajustable talla M', cantidad: 20, costoUnitario: 6500 },
        { productoId: '7', nombre: 'Correa de nylon 1,5 m', cantidad: 12, costoUnitario: 8000 },
        { productoId: '12', nombre: 'Cama para perro mediana', cantidad: 5, costoUnitario: 38000 },
        { productoId: '18', nombre: 'Transportadora mediana', cantidad: 6, costoUnitario: 45000 },
        { productoId: '16', nombre: 'Rascador para gatos', cantidad: 6, costoUnitario: 28000 },
        { productoId: '15', nombre: 'Jaula para hámster', cantidad: 4, costoUnitario: 42000 }
      ],
    },
  ],
  orden: [0, 1, 2, 3],
  devoluciones: [],
  documentos: [
    {
      id: 'C17', tipo: 'cotizacion', fecha: hace(20, 10, 17), cliente: 'Veterinaria Patitas', clienteId: 'C-008', usuario: 'Camila Duarte', usuarioCorreo: 'camila@generico.com',
      observaciones: 'Pedido mensual de antipulgas', total: 520000, vigenciaHasta: hace(5, 10, 17), etapa: 'negociacion', convertidoEn: null, anulado: false,
      items: [
        { productoId: '11', nombre: 'Antipulgas pipeta perro mediano', referencia: 'AP-PI-M', cantidad: 20, valorUnitario: 26000, iva: 19 }
      ],
    },
    {
      id: 'C18', tipo: 'cotizacion', fecha: hace(3, 15, 18), cliente: 'Mariana Ospina', clienteId: 'C-005', usuario: 'Administrador', usuarioCorreo: 'demo@generico.com',
      observaciones: '', total: 110000, vigenciaHasta: dentroDe(12), etapa: 'enviada', convertidoEn: null, anulado: false,
      items: [
        { productoId: '15', nombre: 'Jaula para hámster', referencia: 'JA-HA-01', cantidad: 1, valorUnitario: 65000, iva: 19 },
        { productoId: '16', nombre: 'Rascador para gatos', referencia: 'RA-GA-01', cantidad: 1, valorUnitario: 45000, iva: 19 }
      ],
    },
  ],
  actividades: [
    { id: 'AC-0001', clienteId: 'C-008', tipo: 'llamada', descripcion: 'Confirma que el pedido de antipulgas se decide la próxima semana', fecha: hace(8, 11, 1), vence: '', responsable: 'Camila Duarte', responsableCorreo: 'camila@generico.com', completada: true },
    { id: 'AC-0002', clienteId: 'C-003', tipo: 'whatsapp', descripcion: 'Recordatorio del saldo pendiente', fecha: hace(2, 16, 2), vence: '', responsable: 'Administrador', responsableCorreo: 'demo@generico.com', completada: true },
    { id: 'AC-0003', clienteId: 'C-008', tipo: 'tarea', descripcion: 'Cobrar el saldo de la factura F3', fecha: hace(1, 9, 3), vence: dentroDe(2), responsable: 'Administrador', responsableCorreo: 'demo@generico.com', completada: false },
    { id: 'AC-0004', clienteId: 'C-005', tipo: 'tarea', descripcion: 'Llamar para cerrar la cotización C18', fecha: hace(1, 10, 4), vence: dentroDe(1), responsable: 'Camila Duarte', responsableCorreo: 'camila@generico.com', completada: false },
  ],
  proveedores: [
    { id: 'PV-001', nombre: 'Distribuidora Pet del Valle', nit: '900111222-3', telefono: '602 555 0110', correo: 'ventas@petdelvalle.com', contacto: 'Andrea Ríos', plazoDias: 30 },
    { id: 'PV-002', nombre: 'Agrocampo Pet S.A.S.', nit: '900333444-5', telefono: '604 555 0120', correo: 'pedidos@agrocampo.com', contacto: 'Luis Gómez', plazoDias: 15 },
    { id: 'PV-003', nombre: 'Accesorios Canino Ltda.', nit: '800555666-7', telefono: '601 555 0130', correo: 'comercial@canino.com', contacto: 'Paula Mesa', plazoDias: 30 },
  ],
  ordenesCompra: [],
  ajustesInventario: [],
  auditoria: [],
  ajustes: {
    tienda: { nombre: 'Mundo Mascota', nit: '900.456.789-1', telefono: '604 555 0100', ciudad: 'Medellín', direccion: 'Calle 50 # 42-18' },
    ventas: { metodosPago: ['Efectivo', 'Nequi', 'Tarjeta', 'Transferencia', 'Crédito'], permitirSinExistencias: false },
    recibo: { pie: 'Gracias por cuidar a tu mascota con nosotros', mostrarDatosTienda: true },
  },
  clientes: [
    { id: 'C-001', tipoDocumento: 'CC', documento: '1036654321', tipoPersona: 'natural', nombre: 'Laura Martínez', telefono: '310 555 0142', correo: 'laura.martinez@correo.com', direccion: 'Cra 70 # 44-12', etiquetas: ['Frecuente'], autorizaDatos: true, limiteCredito: 0, plazoDias: 30, creadoEn: hace(40, 9) },
    { id: 'C-002', tipoDocumento: 'CC', documento: '71234567', tipoPersona: 'natural', nombre: 'Carlos Rodríguez', telefono: '311 555 0187', correo: 'carlos.rodriguez@correo.com', direccion: 'Calle 33 # 80-25', etiquetas: [], autorizaDatos: true, limiteCredito: 0, plazoDias: 30, creadoEn: hace(40, 9) },
    { id: 'C-003', tipoDocumento: 'CC', documento: '1017223344', tipoPersona: 'natural', nombre: 'Valentina Gómez', telefono: '312 555 0199', correo: 'valentina.gomez@correo.com', direccion: 'Cra 43A # 5-30', etiquetas: ['Frecuente', 'Crédito'], autorizaDatos: true, limiteCredito: 300000, plazoDias: 30, creadoEn: hace(40, 9) },
    { id: 'C-004', tipoDocumento: 'CC', documento: '98765432', tipoPersona: 'natural', nombre: 'Andrés Herrera', telefono: '313 555 0123', correo: '', direccion: 'Calle 10 # 38-45', etiquetas: [], autorizaDatos: true, limiteCredito: 0, plazoDias: 30, creadoEn: hace(40, 9) },
    { id: 'C-005', tipoDocumento: 'CE', documento: '654321', tipoPersona: 'natural', nombre: 'Mariana Ospina', telefono: '314 555 0166', correo: 'mariana.ospina@correo.com', direccion: 'Av. 80 # 65-10', etiquetas: [], autorizaDatos: true, limiteCredito: 0, plazoDias: 30, creadoEn: hace(40, 9) },
    { id: 'C-006', tipoDocumento: 'CC', documento: '1152443322', tipoPersona: 'natural', nombre: 'Juan Pablo Cardona', telefono: '315 555 0171', correo: '', direccion: 'Cra 50 # 23-60', etiquetas: [], autorizaDatos: true, limiteCredito: 0, plazoDias: 30, creadoEn: hace(40, 9) },
    { id: 'C-007', tipoDocumento: 'CC', documento: '1037556677', tipoPersona: 'natural', nombre: 'Sofía Restrepo', telefono: '316 555 0134', correo: 'sofia.restrepo@correo.com', direccion: 'Calle 7 # 43-90', etiquetas: ['Frecuente'], autorizaDatos: true, limiteCredito: 0, plazoDias: 30, creadoEn: hace(40, 9) },
    { id: 'C-008', tipoDocumento: 'NIT', documento: '901234567-8', tipoPersona: 'juridica', nombre: 'Veterinaria Patitas', telefono: '604 555 0178', correo: 'compras@patitas.com', direccion: 'Cra 65 # 32-14', etiquetas: ['Mayorista', 'Crédito'], autorizaDatos: true, limiteCredito: 1000000, plazoDias: 30, creadoEn: hace(40, 9) },
  ],
  pagos: [
    { id: 'PG-0001', fecha: hace(5, 11, 1), tipo: 'proveedor', terceroId: 'PV-001', tercero: 'Distribuidora Pet del Valle', concepto: 'Abono a factura F-2301', metodo: 'Transferencia', valor: 500000 },
    { id: 'PG-0002', fecha: hace(2, 12, 2), tipo: 'abono', terceroId: 'C-008', tercero: 'Veterinaria Patitas', concepto: 'Abono a deuda', metodo: 'Transferencia', valor: 150000 },
  ],
  cajas: [],
  movimientosCaja: [],
  contabilidad: [],
  roles: [
    { id: ID_ROL_PROPIETARIO, nombre: 'Propietario', descripcion: 'Acceso total. No se puede modificar.', protegido: true, permisos: permisosCompletos() },
    {
      id: 'cajero', nombre: 'Cajero', descripcion: 'Registra ventas y consulta clientes.', protegido: false,
      permisos: { panel: ['ver'], 'nueva-venta': ['ver', 'crear'], ventas: ['ver'], clientes: ['ver', 'crear'], seguimiento: ['ver', 'crear', 'editar'], embudo: ['ver', 'editar'], caja: ['ver', 'crear'] },
    },
    {
      id: 'bodega', nombre: 'Bodega', descripcion: 'Administra el inventario.', protegido: false,
      permisos: { panel: ['ver'], inventario: ['ver', 'crear', 'editar'], bodegas: ['ver', 'crear', 'editar'], proveedores: ['ver', 'crear', 'editar'] },
    },
  ],
  // tiendas: [] = acceso a todas las tiendas
  usuarios: [
    { id: 'U-001', nombre: 'Administrador', correo: 'demo@generico.com', rolId: ID_ROL_PROPIETARIO, activo: true, tiendas: [] },
    { id: 'U-002', nombre: 'Camila Duarte', correo: 'camila@generico.com', rolId: 'cajero', activo: true, tiendas: ['T-01'] },
    { id: 'U-003', nombre: 'Felipe Mora', correo: 'felipe@generico.com', rolId: 'bodega', activo: true, tiendas: [] },
  ],
  tiendas: [
    { id: 'T-01', nombre: 'Tienda Centro', direccion: 'Calle 50 # 42-18', telefono: '604 555 0100', ciudad: 'Medellín', bodegaId: 'B-01', activa: true },
    { id: 'T-02', nombre: 'Tienda Norte', direccion: 'Cra 65 # 98-20', telefono: '604 555 0200', ciudad: 'Medellín', bodegaId: 'B-02', activa: true },
  ],
  bodegas: [
    { id: 'B-01', nombre: 'Bodega Centro', tiendaId: 'T-01', direccion: 'Calle 50 # 42-18', activa: true },
    { id: 'B-02', nombre: 'Bodega Norte', tiendaId: 'T-02', direccion: 'Cra 65 # 98-20', activa: true },
    { id: 'B-03', nombre: 'Bodega principal', tiendaId: '', direccion: 'Zona industrial, bodega 4', activa: true },
  ],
  traslados: [],
  empleados: [
    { id: 'E-001', nombre: 'Administrador', tipoDocumento: 'CC', documento: '43111222', cargo: 'Gerente', tiendaId: 'T-01', telefono: '300 555 0101', correo: 'demo@generico.com',
      fechaIngreso: '2024-02-01', activo: true, usuarioId: 'U-001', metaMensual: 0, comision: 0, turno: 'Lunes a sábado 8:00 a 17:00' },
    { id: 'E-002', nombre: 'Camila Duarte', tipoDocumento: 'CC', documento: '1036998877', cargo: 'Cajera', tiendaId: 'T-01', telefono: '301 555 0102', correo: 'camila@generico.com',
      fechaIngreso: '2025-03-15', activo: true, usuarioId: 'U-002', metaMensual: 3000000, comision: 2, turno: 'Lunes a viernes 9:00 a 18:00' },
    { id: 'E-003', nombre: 'Felipe Mora', tipoDocumento: 'CC', documento: '1017445566', cargo: 'Auxiliar de bodega', tiendaId: 'T-01', telefono: '302 555 0103', correo: 'felipe@generico.com',
      fechaIngreso: '2025-06-01', activo: true, usuarioId: 'U-003', metaMensual: 0, comision: 0, turno: 'Lunes a sábado 7:00 a 16:00' },
    { id: 'E-004', nombre: 'Juliana Restrepo', tipoDocumento: 'CC', documento: '1152334455', cargo: 'Vendedora', tiendaId: 'T-02', telefono: '303 555 0104', correo: '',
      fechaIngreso: '2026-01-10', activo: true, usuarioId: '', metaMensual: 2500000, comision: 2, turno: 'Martes a domingo 10:00 a 19:00' },
  ],
};

// Todo lo de la semilla ocurrió en la Tienda Centro (bodega B-01)
semilla.ventas.forEach((venta) => Object.assign(venta, { tiendaId: 'T-01', bodegaId: 'B-01' }));
semilla.documentos.forEach((documento) => Object.assign(documento, { tiendaId: 'T-01', bodegaId: 'B-01' }));
semilla.facturas.forEach((factura) => Object.assign(factura, { bodegaId: 'B-01' }));
semilla.pagos.forEach((pago) => Object.assign(pago, { tiendaId: 'T-01' }));

// Inventario inicial de ejemplo: el stock con que arrancó cada producto antes de las compras y ventas de la semilla,
// para que su kardex empiece en cero y termine en el stock actual
const cantidadEn = (items, productoId) => items.filter((item) => item.productoId === productoId).reduce((suma, item) => suma + item.cantidad, 0);
semilla.ajustesInventario = semilla.productos.map((producto, posicion) => ({
  id: `AJ-${String(posicion + 1).padStart(4, '0')}`,
  fecha: hace(15, 8, posicion),
  productoId: producto.id,
  cantidad: producto.existencias
    - semilla.facturas.reduce((suma, factura) => suma + cantidadEn(factura.items, producto.id), 0)
    + semilla.ventas.reduce((suma, venta) => suma + cantidadEn(venta.items, producto.id), 0),
  motivo: 'Inventario inicial',
  usuario: 'Administrador',
  bodegaId: 'B-01',
})).filter((ajuste) => ajuste.cantidad !== 0);

// Stock por bodega: lo de arriba queda en la Bodega Centro; la Bodega Norte y la principal arrancan con algunos productos
const STOCK_INICIAL_OTRAS = { 'B-02': { 1: 6, 3: 5, 4: 30, 8: 10, 9: 12, 17: 8 }, 'B-03': { 1: 20, 2: 15, 3: 20, 4: 120, 14: 25 } };
semilla.productos.forEach((producto) => { producto.stock = { 'B-01': producto.existencias }; });
Object.entries(STOCK_INICIAL_OTRAS).forEach(([bodegaId, cantidades]) => {
  Object.entries(cantidades).forEach(([productoId, cantidad]) => {
    const producto = semilla.productos.find((candidato) => candidato.id === productoId);
    producto.stock[bodegaId] = cantidad;
    producto.existencias += cantidad;
    semilla.ajustesInventario.push({
      id: `AJ-${String(semilla.ajustesInventario.length + 1).padStart(4, '0')}`,
      fecha: hace(15, 9, semilla.ajustesInventario.length),
      productoId,
      cantidad,
      motivo: 'Inventario inicial',
      usuario: 'Administrador',
      bodegaId,
    });
  });
});

export { semilla };
