// Reglas de negocio de Clientes. La deuda sale de las ventas a "Fiado" menos los abonos registrados en Pagos.
import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_VALIDO = /^[\d\s()+-]{7,20}$/;

const normalizar = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const buscarCliente = (id) => estado.clientes.find((cliente) => cliente.id === id);

export const ventasDeCliente = (cliente) => estado.ventas.filter((venta) => normalizar(venta.cliente) === normalizar(cliente.nombre));

export function deudaDeCliente(cliente) {
  const fiado = ventasDeCliente(cliente)
    .filter((venta) => venta.metodo === 'Fiado')
    .reduce((acumulado, venta) => acumulado + venta.total, 0);
  const abonos = estado.pagos
    .filter((pago) => pago.tipo === 'abono' && pago.terceroId === cliente.id)
    .reduce((acumulado, pago) => acumulado + pago.valor, 0);
  return Math.max(0, fiado - abonos);
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

function validarDatos({ nombre, telefono, correo }, idActual) {
  if (!nombre) throw new Error('Escribe el nombre del cliente');
  const repetido = estado.clientes.some((cliente) => cliente.id !== idActual && normalizar(cliente.nombre) === normalizar(nombre));
  if (repetido) throw new Error(`Ya existe un cliente llamado ${nombre}`);
  if (telefono && !TELEFONO_VALIDO.test(telefono)) throw new Error('El teléfono solo puede tener números, espacios, paréntesis, + y -');
  if (correo && !CORREO_VALIDO.test(correo)) throw new Error('Escribe un correo válido, por ejemplo nombre@correo.com');
}

const limpiarDatos = (datos) => ({
  nombre: datos.nombre.trim(),
  telefono: datos.telefono.trim(),
  correo: datos.correo.trim().toLowerCase(),
  direccion: datos.direccion.trim(),
});

export function agregarCliente(datos) {
  const limpios = limpiarDatos(datos);
  validarDatos(limpios, null);
  const cliente = { id: siguienteCodigo(estado.clientes.map((existente) => existente.id), 'C', 3), ...limpios };
  estado.clientes.push(cliente);
  guardarEstado();
  return cliente;
}

// Si cambia el nombre, las ventas anteriores se actualizan para no perder la deuda del cliente
export function actualizarCliente(id, datos) {
  const cliente = buscarCliente(id);
  if (!cliente) throw new Error('El cliente no existe');
  const limpios = limpiarDatos(datos);
  validarDatos(limpios, id);
  if (limpios.nombre !== cliente.nombre) {
    ventasDeCliente(cliente).forEach((venta) => { venta.cliente = limpios.nombre; });
  }
  Object.assign(cliente, limpios);
  guardarEstado();
}

export function eliminarCliente(id) {
  const cliente = buscarCliente(id);
  if (!cliente) throw new Error('El cliente no existe');
  const deuda = deudaDeCliente(cliente);
  if (deuda > 0) throw new Error(`${cliente.nombre} tiene una deuda pendiente: registra el abono antes de eliminarlo`);
  estado.clientes = estado.clientes.filter((candidato) => candidato.id !== id);
  guardarEstado();
}
