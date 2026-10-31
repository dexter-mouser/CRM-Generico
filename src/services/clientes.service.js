// Reglas de negocio de Clientes. La deuda sale de las ventas a "Crédito" menos las devoluciones y los abonos registrados en Pagos.
// Ventas, devoluciones y abonos se relacionan con el cliente por su ID (no por el nombre), así cambiar el nombre no afecta la deuda.
import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';
import { exigirPermiso } from '../core/autorizacion.js';
import { exigirTexto, exigirCorreo, exigirTelefono, LIMITES } from '../core/validacion.js';
import { registrarAuditoria } from './auditoria.service.js';

const normalizar = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const buscarCliente = (id) => estado.clientes.find((cliente) => cliente.id === id);

const METODO_CREDITO = 'Crédito';

export const ventasDeCliente = (cliente) => estado.ventas.filter((venta) => venta.clienteId === cliente.id);

export function deudaDeCliente(cliente) {
  const credito = ventasDeCliente(cliente)
    .filter((venta) => venta.metodo === METODO_CREDITO)
    .reduce((acumulado, venta) => acumulado + venta.total, 0);
  const devuelto = estado.devoluciones
    .filter((devolucion) => devolucion.metodo === METODO_CREDITO && devolucion.clienteId === cliente.id)
    .reduce((acumulado, devolucion) => acumulado + devolucion.total, 0);
  const abonos = estado.pagos
    .filter((pago) => pago.tipo === 'abono' && pago.terceroId === cliente.id)
    .reduce((acumulado, pago) => acumulado + pago.valor, 0);
  return Math.max(0, credito - devuelto - abonos);
}

export const clientesConDeuda = () => estado.clientes.filter((cliente) => deudaDeCliente(cliente) > 0);

// Limpia y valida los datos; el nombre no puede repetirse entre clientes
function prepararDatos(datos, idActual) {
  const limpios = {
    nombre: exigirTexto(datos.nombre, 'el nombre del cliente'),
    telefono: exigirTelefono(datos.telefono),
    correo: exigirCorreo(datos.correo, { obligatorio: false }),
    direccion: exigirTexto(datos.direccion, 'la dirección', { obligatorio: false, maximo: LIMITES.textoLargo }),
  };
  const repetido = estado.clientes.some((cliente) => cliente.id !== idActual && normalizar(cliente.nombre) === normalizar(limpios.nombre));
  if (repetido) throw new Error(`Ya existe un cliente llamado ${limpios.nombre}`);
  return limpios;
}

export function agregarCliente(datos) {
  exigirPermiso('clientes', 'crear', 'crear clientes');
  const limpios = prepararDatos(datos, null);
  const cliente = { id: siguienteCodigo(estado.clientes.map((existente) => existente.id), 'C', 3), ...limpios };
  estado.clientes.push(cliente);
  registrarAuditoria('clientes', 'Cliente creado', `${cliente.id} · ${cliente.nombre}`);
  guardarEstado();
  return cliente;
}

// Las ventas anteriores conservan el nombre con el que se hicieron; la deuda sigue al cliente por su ID
export function actualizarCliente(id, datos) {
  exigirPermiso('clientes', 'editar', 'editar clientes');
  const cliente = buscarCliente(id);
  if (!cliente) throw new Error('El cliente no existe');
  const limpios = prepararDatos(datos, id);
  Object.assign(cliente, limpios);
  registrarAuditoria('clientes', 'Cliente editado', `${cliente.id} · ${cliente.nombre}`);
  guardarEstado();
}

export function eliminarCliente(id) {
  exigirPermiso('clientes', 'eliminar', 'eliminar clientes');
  const cliente = buscarCliente(id);
  if (!cliente) throw new Error('El cliente no existe');
  const deuda = deudaDeCliente(cliente);
  if (deuda > 0) throw new Error(`${cliente.nombre} tiene una deuda pendiente: registra el abono antes de eliminarlo`);
  estado.clientes = estado.clientes.filter((candidato) => candidato.id !== id);
  registrarAuditoria('clientes', 'Cliente eliminado', `${cliente.id} · ${cliente.nombre}`);
  guardarEstado();
}
