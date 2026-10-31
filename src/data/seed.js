// Datos de ejemplo de una tienda de mascotas. Luego se reemplazan por llamadas a la API.
import { ID_ROL_PROPIETARIO, permisosCompletos } from '../config/permisos.js';

// Fecha de "hace N días" a la hora indicada (nunca en el futuro); los minutos separan registros de la misma hora
const hace = (dias, hora, minutos = 0) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  fecha.setHours(hora, minutos, 0, 0);
  return new Date(Math.min(fecha.getTime(), Date.now() - 60000)).toISOString();
};

export const semilla = {
  version: 3,
  productos: [
    { id: 'P-001', referencia: 'DC-AD-4', nombre: 'Dog Chow adulto razas medianas 4 kg', costo: 52000, existencias: 14 },
    { id: 'P-002', referencia: 'PD-CA-2', nombre: 'Pedigree cachorro 2 kg', costo: 24000, existencias: 9 },
    { id: 'P-003', referencia: 'CC-AD-15', nombre: 'Cat Chow gatos adultos 1,5 kg', costo: 21000, existencias: 12 },
    { id: 'P-004', referencia: 'WH-SO-85', nombre: 'Whiskas pescado sobre 85 g', costo: 1800, existencias: 60 },
    { id: 'P-005', referencia: 'AR-GA-10', nombre: 'Arena sanitaria para gatos 10 kg', costo: 19000, existencias: 3 },
    { id: 'P-006', referencia: 'CO-AJ-M', nombre: 'Collar ajustable talla M', costo: 6500, existencias: 18 },
    { id: 'P-007', referencia: 'CR-NY-15', nombre: 'Correa de nylon 1,5 m', costo: 8000, existencias: 11 },
    { id: 'P-008', referencia: 'PE-CA-01', nombre: 'Pelota de caucho', costo: 2500, existencias: 25 },
    { id: 'P-009', referencia: 'HU-CU-M', nombre: 'Hueso de cuero prensado mediano', costo: 3000, existencias: 30 },
    { id: 'P-010', referencia: 'SH-AP-250', nombre: 'Shampoo antipulgas 250 ml', costo: 11000, existencias: 7 },
    { id: 'P-011', referencia: 'AP-PI-M', nombre: 'Antipulgas pipeta perro mediano', costo: 17000, existencias: 2 },
    { id: 'P-012', referencia: 'CA-PE-M', nombre: 'Cama para perro mediana', costo: 38000, existencias: 4 },
    { id: 'P-013', referencia: 'CM-AC-01', nombre: 'Comedero de acero inoxidable', costo: 7500, existencias: 16 },
    { id: 'P-014', referencia: 'AL-PE-50', nombre: 'Alimento para peces en hojuelas 50 g', costo: 3500, existencias: 20 },
    { id: 'P-015', referencia: 'JA-HA-01', nombre: 'Jaula para hámster', costo: 42000, existencias: 3 },
    { id: 'P-016', referencia: 'RA-GA-01', nombre: 'Rascador para gatos', costo: 28000, existencias: 5 },
    { id: 'P-017', referencia: 'SN-DE-07', nombre: 'Snack dental para perro x 7', costo: 9500, existencias: 22 },
    { id: 'P-018', referencia: 'TR-ME-01', nombre: 'Transportadora mediana', costo: 45000, existencias: 6 },
  ],
  ventas: [
    {
      id: 'V-0001', fecha: hace(6, 9, 1), cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 29600,
      items: [
        { productoId: 'P-004', nombre: 'Whiskas pescado sobre 85 g', cantidad: 6, valorUnitario: 2600 },
        { productoId: 'P-009', nombre: 'Hueso de cuero prensado mediano', cantidad: 2, valorUnitario: 7000 }
      ],
    },
    {
      id: 'V-0002', fecha: hace(6, 11, 2), cliente: 'Laura Martínez', metodo: 'Nequi', total: 100000,
      items: [
        { productoId: 'P-001', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 1, valorUnitario: 68000 },
        { productoId: 'P-017', nombre: 'Snack dental para perro x 7', cantidad: 2, valorUnitario: 16000 }
      ],
    },
    {
      id: 'V-0003', fecha: hace(6, 16, 3), cliente: 'Veterinaria Patitas', metodo: 'Fiado', total: 215000,
      items: [
        { productoId: 'P-010', nombre: 'Shampoo antipulgas 250 ml', cantidad: 4, valorUnitario: 18500 },
        { productoId: 'P-011', nombre: 'Antipulgas pipeta perro mediano', cantidad: 3, valorUnitario: 26000 },
        { productoId: 'P-002', nombre: 'Pedigree cachorro 2 kg', cantidad: 2, valorUnitario: 31500 }
      ],
    },
    {
      id: 'V-0004', fecha: hace(5, 10, 4), cliente: 'Carlos Rodríguez', metodo: 'Tarjeta', total: 87000,
      items: [
        { productoId: 'P-012', nombre: 'Cama para perro mediana', cantidad: 1, valorUnitario: 59000 },
        { productoId: 'P-013', nombre: 'Comedero de acero inoxidable', cantidad: 2, valorUnitario: 14000 }
      ],
    },
    {
      id: 'V-0005', fecha: hace(5, 15, 5), cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 30000,
      items: [
        { productoId: 'P-008', nombre: 'Pelota de caucho', cantidad: 3, valorUnitario: 6000 },
        { productoId: 'P-006', nombre: 'Collar ajustable talla M', cantidad: 1, valorUnitario: 12000 }
      ],
    },
    {
      id: 'V-0006', fecha: hace(4, 9, 6), cliente: 'Valentina Gómez', metodo: 'Fiado', total: 82000,
      items: [
        { productoId: 'P-003', nombre: 'Cat Chow gatos adultos 1,5 kg', cantidad: 2, valorUnitario: 28000 },
        { productoId: 'P-005', nombre: 'Arena sanitaria para gatos 10 kg', cantidad: 1, valorUnitario: 26000 }
      ],
    },
    {
      id: 'V-0007', fecha: hace(4, 17, 7), cliente: 'Mariana Ospina', metodo: 'Transferencia', total: 80000,
      items: [
        { productoId: 'P-015', nombre: 'Jaula para hámster', cantidad: 1, valorUnitario: 65000 },
        { productoId: 'P-014', nombre: 'Alimento para peces en hojuelas 50 g', cantidad: 2, valorUnitario: 7500 }
      ],
    },
    {
      id: 'V-0008', fecha: hace(3, 12, 8), cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 78400,
      items: [
        { productoId: 'P-001', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 1, valorUnitario: 68000 },
        { productoId: 'P-004', nombre: 'Whiskas pescado sobre 85 g', cantidad: 4, valorUnitario: 2600 }
      ],
    },
    {
      id: 'V-0009', fecha: hace(3, 18, 9), cliente: 'Andrés Herrera', metodo: 'Nequi', total: 48000,
      items: [
        { productoId: 'P-007', nombre: 'Correa de nylon 1,5 m', cantidad: 1, valorUnitario: 15000 },
        { productoId: 'P-006', nombre: 'Collar ajustable talla M', cantidad: 1, valorUnitario: 12000 },
        { productoId: 'P-009', nombre: 'Hueso de cuero prensado mediano', cantidad: 3, valorUnitario: 7000 }
      ],
    },
    {
      id: 'V-0010', fecha: hace(2, 10, 10), cliente: 'Juan Pablo Cardona', metodo: 'Efectivo', total: 71000,
      items: [
        { productoId: 'P-016', nombre: 'Rascador para gatos', cantidad: 1, valorUnitario: 45000 },
        { productoId: 'P-005', nombre: 'Arena sanitaria para gatos 10 kg', cantidad: 1, valorUnitario: 26000 }
      ],
    },
    {
      id: 'V-0011', fecha: hace(2, 14, 11), cliente: 'Sofía Restrepo', metodo: 'Tarjeta', total: 120000,
      items: [
        { productoId: 'P-018', nombre: 'Transportadora mediana', cantidad: 1, valorUnitario: 72000 },
        { productoId: 'P-017', nombre: 'Snack dental para perro x 7', cantidad: 3, valorUnitario: 16000 }
      ],
    },
    {
      id: 'V-0012', fecha: hace(1, 9, 12), cliente: 'Cliente sin nombre', metodo: 'Efectivo', total: 75000,
      items: [
        { productoId: 'P-002', nombre: 'Pedigree cachorro 2 kg', cantidad: 2, valorUnitario: 31500 },
        { productoId: 'P-008', nombre: 'Pelota de caucho', cantidad: 2, valorUnitario: 6000 }
      ],
    },
    {
      id: 'V-0013', fecha: hace(1, 13, 13), cliente: 'Carlos Rodríguez', metodo: 'Nequi', total: 100500,
      items: [
        { productoId: 'P-001', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 1, valorUnitario: 68000 },
        { productoId: 'P-010', nombre: 'Shampoo antipulgas 250 ml', cantidad: 1, valorUnitario: 18500 },
        { productoId: 'P-013', nombre: 'Comedero de acero inoxidable', cantidad: 1, valorUnitario: 14000 }
      ],
    },
    {
      id: 'V-0014', fecha: hace(1, 17, 14), cliente: 'Valentina Gómez', metodo: 'Fiado', total: 74000,
      items: [
        { productoId: 'P-012', nombre: 'Cama para perro mediana', cantidad: 1, valorUnitario: 59000 },
        { productoId: 'P-007', nombre: 'Correa de nylon 1,5 m', cantidad: 1, valorUnitario: 15000 }
      ],
    },
    {
      id: 'V-0015', fecha: hace(0, 9, 15), cliente: 'Laura Martínez', metodo: 'Efectivo', total: 29000,
      items: [
        { productoId: 'P-004', nombre: 'Whiskas pescado sobre 85 g', cantidad: 5, valorUnitario: 2600 },
        { productoId: 'P-017', nombre: 'Snack dental para perro x 7', cantidad: 1, valorUnitario: 16000 }
      ],
    },
    {
      id: 'V-0016', fecha: hace(0, 10, 16), cliente: 'Cliente sin nombre', metodo: 'Nequi', total: 42000,
      items: [
        { productoId: 'P-003', nombre: 'Cat Chow gatos adultos 1,5 kg', cantidad: 1, valorUnitario: 28000 },
        { productoId: 'P-009', nombre: 'Hueso de cuero prensado mediano', cantidad: 2, valorUnitario: 7000 }
      ],
    },
  ],
  facturas: [
    {
      numero: 'F-2301', proveedor: 'Distribuidora Pet del Valle', fecha: hace(9, 8).slice(0, 10), total: 1230000,
      items: [
        { productoId: 'P-001', nombre: 'Dog Chow adulto razas medianas 4 kg', cantidad: 12, costoUnitario: 52000 },
        { productoId: 'P-002', nombre: 'Pedigree cachorro 2 kg', cantidad: 10, costoUnitario: 24000 },
        { productoId: 'P-003', nombre: 'Cat Chow gatos adultos 1,5 kg', cantidad: 12, costoUnitario: 21000 },
        { productoId: 'P-005', nombre: 'Arena sanitaria para gatos 10 kg', cantidad: 6, costoUnitario: 19000 }
      ],
    },
    {
      numero: 'F-0877', proveedor: 'Agrocampo Pet S.A.S.', fecha: hace(6, 8).slice(0, 10), total: 532000,
      items: [
        { productoId: 'P-004', nombre: 'Whiskas pescado sobre 85 g', cantidad: 80, costoUnitario: 1800 },
        { productoId: 'P-009', nombre: 'Hueso de cuero prensado mediano', cantidad: 30, costoUnitario: 3000 },
        { productoId: 'P-017', nombre: 'Snack dental para perro x 7', cantidad: 24, costoUnitario: 9500 },
        { productoId: 'P-014', nombre: 'Alimento para peces en hojuelas 50 g', cantidad: 20, costoUnitario: 3500 }
      ],
    },
    {
      numero: 'F-4410', proveedor: 'Accesorios Canino Ltda.', fecha: hace(3, 8).slice(0, 10), total: 1022000,
      items: [
        { productoId: 'P-006', nombre: 'Collar ajustable talla M', cantidad: 20, costoUnitario: 6500 },
        { productoId: 'P-007', nombre: 'Correa de nylon 1,5 m', cantidad: 12, costoUnitario: 8000 },
        { productoId: 'P-012', nombre: 'Cama para perro mediana', cantidad: 5, costoUnitario: 38000 },
        { productoId: 'P-018', nombre: 'Transportadora mediana', cantidad: 6, costoUnitario: 45000 },
        { productoId: 'P-016', nombre: 'Rascador para gatos', cantidad: 6, costoUnitario: 28000 },
        { productoId: 'P-015', nombre: 'Jaula para hámster', cantidad: 4, costoUnitario: 42000 }
      ],
    },
  ],
  orden: [0, 1, 2, 3],
  devoluciones: [],
  documentos: [],
  auditoria: [],
  ajustes: {
    tienda: { nombre: 'Mundo Mascota', nit: '900.456.789-1', telefono: '604 555 0100', ciudad: 'Medellín', direccion: 'Calle 50 # 42-18' },
    ventas: { metodosPago: ['Efectivo', 'Nequi', 'Tarjeta', 'Transferencia', 'Fiado'], permitirSinExistencias: false },
    recibo: { pie: 'Gracias por cuidar a tu mascota con nosotros', mostrarDatosTienda: true },
  },
  clientes: [
    { id: 'C-001', nombre: 'Laura Martínez', telefono: '310 555 0142', correo: 'laura.martinez@correo.com', direccion: 'Cra 70 # 44-12' },
    { id: 'C-002', nombre: 'Carlos Rodríguez', telefono: '311 555 0187', correo: 'carlos.rodriguez@correo.com', direccion: 'Calle 33 # 80-25' },
    { id: 'C-003', nombre: 'Valentina Gómez', telefono: '312 555 0199', correo: 'valentina.gomez@correo.com', direccion: 'Cra 43A # 5-30' },
    { id: 'C-004', nombre: 'Andrés Herrera', telefono: '313 555 0123', correo: '', direccion: 'Calle 10 # 38-45' },
    { id: 'C-005', nombre: 'Mariana Ospina', telefono: '314 555 0166', correo: 'mariana.ospina@correo.com', direccion: 'Av. 80 # 65-10' },
    { id: 'C-006', nombre: 'Juan Pablo Cardona', telefono: '315 555 0171', correo: '', direccion: 'Cra 50 # 23-60' },
    { id: 'C-007', nombre: 'Sofía Restrepo', telefono: '316 555 0134', correo: 'sofia.restrepo@correo.com', direccion: 'Calle 7 # 43-90' },
    { id: 'C-008', nombre: 'Veterinaria Patitas', telefono: '604 555 0178', correo: 'compras@patitas.com', direccion: 'Cra 65 # 32-14' },
  ],
  pagos: [
    { id: 'PG-0001', fecha: hace(5, 11, 1), tipo: 'proveedor', terceroId: null, tercero: 'Distribuidora Pet del Valle', concepto: 'Abono a factura F-2301', metodo: 'Transferencia', valor: 500000 },
    { id: 'PG-0002', fecha: hace(2, 12, 2), tipo: 'abono', terceroId: 'C-008', tercero: 'Veterinaria Patitas', concepto: 'Abono a deuda', metodo: 'Transferencia', valor: 150000 },
  ],
  cajas: [],
  movimientosCaja: [],
  contabilidad: [],
  roles: [
    { id: ID_ROL_PROPIETARIO, nombre: 'Propietario', descripcion: 'Acceso total. No se puede modificar.', protegido: true, permisos: permisosCompletos() },
    {
      id: 'cajero', nombre: 'Cajero', descripcion: 'Registra ventas y consulta clientes.', protegido: false,
      permisos: { panel: ['ver'], 'nueva-venta': ['ver', 'crear'], ventas: ['ver'], clientes: ['ver', 'crear'], caja: ['ver', 'crear'] },
    },
    {
      id: 'bodega', nombre: 'Bodega', descripcion: 'Administra el inventario.', protegido: false,
      permisos: { panel: ['ver'], inventario: ['ver', 'crear', 'editar'] },
    },
  ],
  usuarios: [
    { id: 'U-001', nombre: 'Administrador', correo: 'demo@generico.com', rolId: ID_ROL_PROPIETARIO, activo: true },
    { id: 'U-002', nombre: 'Camila Duarte', correo: 'camila@generico.com', rolId: 'cajero', activo: true },
    { id: 'U-003', nombre: 'Felipe Mora', correo: 'felipe@generico.com', rolId: 'bodega', activo: true },
  ],
};
