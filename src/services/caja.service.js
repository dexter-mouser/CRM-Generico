// Reglas de negocio de Caja: apertura con base, ingresos y egresos, y cierre con diferencia.
// Efectivo esperado = base + ventas en efectivo + abonos en efectivo + ingresos - egresos - pagos a proveedores en efectivo.
import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';

export const cajaAbierta = () => estado.cajas.find((caja) => !caja.cierre) ?? null;

const sumar = (lista, campo = 'valor') => lista.reduce((acumulado, elemento) => acumulado + elemento[campo], 0);

// Movimientos de una caja: todo lo ocurrido desde su apertura (y hasta su cierre, si ya se cerró)
export function resumenDeCaja(caja) {
  const desde = new Date(caja.apertura).getTime();
  const hasta = caja.cierre ? new Date(caja.cierre.fecha).getTime() : Infinity;
  const dentro = (fecha) => {
    const momento = new Date(fecha).getTime();
    return momento >= desde && momento <= hasta;
  };
  const efectivo = (elemento) => elemento.metodo === 'Efectivo';
  const ventasEfectivo = sumar(estado.ventas.filter((venta) => efectivo(venta) && dentro(venta.fecha)), 'total');
  const abonosEfectivo = sumar(estado.pagos.filter((pago) => pago.tipo === 'abono' && efectivo(pago) && dentro(pago.fecha)));
  const pagosProveedores = sumar(estado.pagos.filter((pago) => pago.tipo === 'proveedor' && efectivo(pago) && dentro(pago.fecha)));
  const movimientos = estado.movimientosCaja.filter((movimiento) => movimiento.cajaId === caja.id);
  const ingresos = sumar(movimientos.filter((movimiento) => movimiento.tipo === 'ingreso'));
  const egresos = sumar(movimientos.filter((movimiento) => movimiento.tipo === 'egreso'));
  return {
    base: caja.base,
    ventasEfectivo,
    abonosEfectivo,
    ingresos,
    egresos,
    pagosProveedores,
    esperado: caja.base + ventasEfectivo + abonosEfectivo + ingresos - egresos - pagosProveedores,
    movimientos,
  };
}

export function efectivoEnCaja() {
  const caja = cajaAbierta();
  return caja ? resumenDeCaja(caja).esperado : 0;
}

export function abrirCaja(base) {
  if (cajaAbierta()) throw new Error('Ya hay una caja abierta');
  if (!(base >= 0)) throw new Error('Escribe la base con la que abres la caja (puede ser 0)');
  const caja = {
    id: siguienteCodigo(estado.cajas.map((existente) => existente.id), 'K', 3),
    apertura: new Date().toISOString(),
    base,
    cierre: null,
  };
  estado.cajas.push(caja);
  guardarEstado();
  return caja;
}

export function registrarMovimiento({ tipo, concepto, valor }) {
  const caja = cajaAbierta();
  if (!caja) throw new Error('Abre la caja antes de registrar movimientos');
  if (!['ingreso', 'egreso'].includes(tipo)) throw new Error('Elige si es un ingreso o un egreso');
  if (!concepto.trim()) throw new Error('Escribe el concepto del movimiento');
  if (!(valor > 0)) throw new Error('Escribe el valor del movimiento');
  const movimiento = {
    id: siguienteCodigo(estado.movimientosCaja.map((existente) => existente.id), 'M', 4),
    cajaId: caja.id,
    fecha: new Date().toISOString(),
    tipo,
    concepto: concepto.trim(),
    valor,
  };
  estado.movimientosCaja.push(movimiento);
  guardarEstado();
  return movimiento;
}

// Devuelve el cierre con la diferencia entre lo contado y lo esperado (negativa si falta efectivo)
export function cerrarCaja(contado) {
  const caja = cajaAbierta();
  if (!caja) throw new Error('No hay una caja abierta');
  if (!(contado >= 0)) throw new Error('Escribe el efectivo que contaste (puede ser 0)');
  const esperado = resumenDeCaja(caja).esperado;
  caja.cierre = { fecha: new Date().toISOString(), contado, esperado, diferencia: contado - esperado };
  guardarEstado();
  return caja.cierre;
}
