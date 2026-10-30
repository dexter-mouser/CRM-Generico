// Datos de prueba. Luego se reemplazan por llamadas a la API.
import { ID_ROL_PROPIETARIO, permisosCompletos } from '../config/permisos.js';

const haceDias = (dias) => new Date(Date.now() - dias * 86400000).toISOString();

export const semilla = {
  version: 2,
  productos: [
    { id: 'P-001', referencia: 'REF-A01', nombre: 'Producto de prueba A', costo: 8000, existencias: 25 },
    { id: 'P-002', referencia: 'REF-B02', nombre: 'Producto de prueba B', costo: 5500, existencias: 4 },
    { id: 'P-003', referencia: 'REF-C03', nombre: 'Producto de prueba C', costo: 21000, existencias: -2 },
  ],
  ventas: [
    {
      id: 'V-0001', fecha: haceDias(3), cliente: 'Cliente de prueba 1', metodo: 'Efectivo', total: 45000,
      items: [{ productoId: 'P-001', nombre: 'Producto de prueba A', cantidad: 2, valorUnitario: 22500 }],
    },
    {
      id: 'V-0002', fecha: haceDias(2), cliente: 'Cliente de prueba 2', metodo: 'Nequi', total: 120000,
      items: [
        { productoId: 'P-002', nombre: 'Producto de prueba B', cantidad: 6, valorUnitario: 12000 },
        { productoId: 'P-001', nombre: 'Producto de prueba A', cantidad: 2, valorUnitario: 24000 },
      ],
    },
    {
      id: 'V-0003', fecha: haceDias(1), cliente: 'Cliente de prueba 3', metodo: 'Fiado', total: 30000,
      items: [{ productoId: 'P-003', nombre: 'Producto de prueba C', cantidad: 1, valorUnitario: 30000 }],
    },
    {
      id: 'V-0004', fecha: haceDias(0), cliente: 'Cliente de prueba 4', metodo: 'Tarjeta', total: 75000,
      items: [{ productoId: 'P-001', nombre: 'Producto de prueba A', cantidad: 3, valorUnitario: 25000 }],
    },
  ],
  facturas: [
    {
      numero: 'F-1001', proveedor: 'Proveedor de prueba', fecha: haceDias(5).slice(0, 10), total: 240000,
      items: [{ productoId: 'P-001', nombre: 'Producto de prueba A', cantidad: 30, costoUnitario: 8000 }],
    },
  ],
  orden: [0, 1, 2, 3],
  ajustes: {
    tienda: { nombre: 'Genérico', nit: '', telefono: '', ciudad: '', direccion: '' },
    ventas: { metodosPago: ['Efectivo', 'Nequi', 'Tarjeta', 'Transferencia', 'Fiado'], permitirSinExistencias: true },
    recibo: { pie: 'Gracias por su compra', mostrarDatosTienda: true },
  },
  clientes: [
    { id: 'C-001', nombre: 'Cliente de prueba 1', telefono: '', correo: '', direccion: '' },
    { id: 'C-002', nombre: 'Cliente de prueba 2', telefono: '', correo: '', direccion: '' },
    { id: 'C-003', nombre: 'Cliente de prueba 3', telefono: '', correo: '', direccion: '' },
    { id: 'C-004', nombre: 'Cliente de prueba 4', telefono: '', correo: '', direccion: '' },
  ],
  pagos: [],
  cajas: [],
  movimientosCaja: [],
  roles: [
    { id: ID_ROL_PROPIETARIO, nombre: 'Propietario', descripcion: 'Acceso total. No se puede modificar.', protegido: true, permisos: permisosCompletos() },
    {
      id: 'cajero', nombre: 'Cajero', descripcion: 'Registra ventas y consulta clientes.', protegido: false,
      permisos: { panel: ['ver'], 'nueva-venta': ['ver', 'crear'], ventas: ['ver'], clientes: ['ver', 'crear'], caja: ['ver'] },
    },
    {
      id: 'bodega', nombre: 'Bodega', descripcion: 'Administra el inventario.', protegido: false,
      permisos: { panel: ['ver'], inventario: ['ver', 'crear', 'editar'] },
    },
  ],
  usuarios: [
    { id: 'U-001', nombre: 'Propietario de prueba', correo: 'propietario@tienda.com', rolId: ID_ROL_PROPIETARIO, activo: true },
    { id: 'U-002', nombre: 'Cajero de prueba', correo: 'cajero@tienda.com', rolId: 'cajero', activo: true },
    { id: 'U-003', nombre: 'Bodega de prueba', correo: 'bodega@tienda.com', rolId: 'bodega', activo: false },
  ],
};
