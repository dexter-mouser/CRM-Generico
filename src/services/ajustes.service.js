// Reglas de negocio de Ajustes: datos de la tienda, recibo, ventas y restablecimiento de datos de prueba.
import { estado, guardarEstado } from '../core/store.js';
import { semilla } from '../data/seed.js';
import { borrarBusquedas } from '../core/busquedas.js';
import { exigirPermiso } from '../core/autorizacion.js';
import { exigirTelefono, exigirTexto, LIMITES } from '../core/validacion.js';
import { registrarAuditoria } from './auditoria.service.js';

export const METODOS_DISPONIBLES = ['Efectivo', 'Nequi', 'Tarjeta', 'Transferencia', 'Crédito'];

export function guardarDatosTienda({ nombre, nit, telefono, ciudad, direccion }) {
  exigirPermiso('ajustes', 'editar', 'cambiar los ajustes');
  Object.assign(estado.ajustes.tienda, {
    nombre: exigirTexto(nombre, 'el nombre de la tienda'),
    nit: exigirTexto(nit, 'el NIT', { obligatorio: false, maximo: 30 }),
    telefono: exigirTelefono(telefono),
    ciudad: exigirTexto(ciudad, 'la ciudad', { obligatorio: false }),
    direccion: exigirTexto(direccion, 'la dirección', { obligatorio: false, maximo: LIMITES.textoLargo }),
  });
  registrarAuditoria('ajustes', 'Datos de la tienda', estado.ajustes.tienda.nombre);
  guardarEstado();
}

export function guardarMensajeRecibo(pie) {
  exigirPermiso('ajustes', 'editar', 'cambiar los ajustes');
  estado.ajustes.recibo.pie = exigirTexto(pie, 'el mensaje del recibo', { obligatorio: false, maximo: LIMITES.textoLargo });
  registrarAuditoria('ajustes', 'Mensaje del recibo', '');
  guardarEstado();
}

export function establecerMostrarDatosTienda(valor) {
  exigirPermiso('ajustes', 'editar', 'cambiar los ajustes');
  estado.ajustes.recibo.mostrarDatosTienda = Boolean(valor);
  registrarAuditoria('ajustes', 'Datos de la tienda en el recibo', valor ? 'Se muestran' : 'Se ocultan');
  guardarEstado();
}

// Activa o desactiva un método de pago; siempre debe quedar al menos uno disponible
export function establecerMetodoPago(metodo, activo) {
  exigirPermiso('ajustes', 'editar', 'cambiar los ajustes');
  const actuales = estado.ajustes.ventas.metodosPago;
  const nuevos = METODOS_DISPONIBLES.filter((candidato) => (candidato === metodo ? activo : actuales.includes(candidato)));
  if (!nuevos.length) throw new Error('Debe quedar al menos un método de pago disponible');
  estado.ajustes.ventas.metodosPago = nuevos;
  registrarAuditoria('ajustes', 'Métodos de pago', nuevos.join(', '));
  guardarEstado();
}

export function establecerPermitirSinExistencias(valor) {
  exigirPermiso('ajustes', 'editar', 'cambiar los ajustes');
  estado.ajustes.ventas.permitirSinExistencias = Boolean(valor);
  registrarAuditoria('ajustes', 'Ventas sin existencias', valor ? 'Permitidas' : 'No permitidas');
  guardarEstado();
}

// Vuelve el inventario, las ventas, las remisiones y cotizaciones, los clientes, los pagos, la caja y la contabilidad
// a los datos de ejemplo; los ajustes, roles, personas y la auditoría no cambian
export function restablecerDatosDePrueba() {
  exigirPermiso('ajustes', 'editar', 'cambiar los ajustes');
  const datos = structuredClone(semilla);
  const claves = ['productos', 'ventas', 'documentos', 'facturas', 'orden', 'clientes', 'pagos', 'cajas', 'movimientosCaja', 'contabilidad', 'devoluciones'];
  claves.forEach((clave) => { estado[clave] = datos[clave]; });
  borrarBusquedas();
  registrarAuditoria('ajustes', 'Datos de ejemplo restablecidos', '');
  guardarEstado();
}
