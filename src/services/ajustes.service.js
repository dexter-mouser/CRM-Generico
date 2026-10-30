// Reglas de negocio de Ajustes: datos de la tienda, recibo, ventas y restablecimiento de datos de prueba.
import { estado, guardarEstado } from '../core/store.js';
import { semilla } from '../data/seed.js';
import { borrarBusquedas } from '../core/busquedas.js';

export const METODOS_DISPONIBLES = ['Efectivo', 'Nequi', 'Tarjeta', 'Transferencia', 'Fiado'];

const TELEFONO_VALIDO = /^[\d\s()+-]{7,20}$/;

export function guardarDatosTienda({ nombre, nit, telefono, ciudad, direccion }) {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) throw new Error('Escribe el nombre de la tienda');
  const telefonoLimpio = telefono.trim();
  if (telefonoLimpio && !TELEFONO_VALIDO.test(telefonoLimpio)) {
    throw new Error('El teléfono solo puede tener números, espacios, paréntesis, + y -');
  }
  Object.assign(estado.ajustes.tienda, {
    nombre: nombreLimpio,
    nit: nit.trim(),
    telefono: telefonoLimpio,
    ciudad: ciudad.trim(),
    direccion: direccion.trim(),
  });
  guardarEstado();
}

export function guardarMensajeRecibo(pie) {
  estado.ajustes.recibo.pie = pie.trim();
  guardarEstado();
}

export function establecerMostrarDatosTienda(valor) {
  estado.ajustes.recibo.mostrarDatosTienda = Boolean(valor);
  guardarEstado();
}

// Activa o desactiva un método de pago; siempre debe quedar al menos uno disponible
export function establecerMetodoPago(metodo, activo) {
  const actuales = estado.ajustes.ventas.metodosPago;
  const nuevos = METODOS_DISPONIBLES.filter((candidato) => (candidato === metodo ? activo : actuales.includes(candidato)));
  if (!nuevos.length) throw new Error('Debe quedar al menos un método de pago disponible');
  estado.ajustes.ventas.metodosPago = nuevos;
  guardarEstado();
}

export function establecerPermitirSinExistencias(valor) {
  estado.ajustes.ventas.permitirSinExistencias = Boolean(valor);
  guardarEstado();
}

// Vuelve productos, ventas y facturas a los datos de prueba; los ajustes, roles y personas no cambian
export function restablecerDatosDePrueba() {
  const { productos, ventas, facturas, orden } = structuredClone(semilla);
  Object.assign(estado, { productos, ventas, facturas, orden });
  borrarBusquedas();
  guardarEstado();
}
