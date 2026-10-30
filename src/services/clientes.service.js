// Reglas de negocio de Clientes. La deuda sale de las ventas a "Fiado" menos las devoluciones y los abonos registrados en Pagos.
import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';
import { exigirPermiso } from '../core/autorizacion.js';
import { exigirTexto, exigirCorreo, exigirTelefono, LIMITES } from '../core/validacion.js';
import { registrarAuditoria } from './auditoria.service.js';

const normalizar = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const buscarCliente = (id) => estado.clientes.find((cliente) => cliente.id === id);

export const ventasDeCliente = (cliente) => estado.ventas.filter((venta) => normalizar(venta.cliente) === normalizar(cliente.nombre));

export function deudaDeCliente(cliente) {
  const fiado = ventasDeCliente(cliente)
    .filter((venta) => venta.metodo === 'Fiado')
    .reduce((acumulado, venta) => acumulado + venta.total, 0);
  const devuelto = estado.devoluciones
    .filter((devolucion) => devolucion.metodo === 'Fiado' && normalizar(devolucion.cliente) === normalizar(cliente.nombre))
    .reduce((acumulado, devolucion) => acumulado + devolucion.total, 0);
  const abonos = estado.pagos
    .filter((pago) => pago.tipo === 'abono' && pago.terceroId === cliente.id)
    .reduce((acumulado, pago) => acumulado + pago.valor, 0);
  return Math.max(0, fiado - devuelto - abonos);
}

export const clientesConDeuda = () => estado.clientes.filter((cliente) => deudaDeCliente(cliente) > 0);

// Cada palabra escrita debe aparecer en el ID, nombre, teléfono o correo
export function buscarClientes(consulta = '') {
  const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
  return estado.clientes.filter((cliente) => {
    const texto = normalizar([cliente.id, cliente.nombre, cliente.telefono, cliente.correo].join(' '));
    return terminos.every((termino) => texto.includes(termino));
  });
}

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

// Si cambia el nombre, las ventas anteriores se actualizan para no perder la deuda del cliente
export function actualizarCliente(id, datos) {
  exigirPermiso('clientes', 'editar', 'editar clientes');
  const cliente = buscarCliente(id);
  if (!cliente) throw new Error('El cliente no existe');
  const limpios = prepararDatos(datos, id);
  if (limpios.nombre !== cliente.nombre) {
    ventasDeCliente(cliente).forEach((venta) => { venta.cliente = limpios.nombre; });
    estado.devoluciones.filter((devolucion) => normalizar(devolucion.cliente) === normalizar(cliente.nombre))
      .forEach((devolucion) => { devolucion.cliente = limpios.nombre; });
  }
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
