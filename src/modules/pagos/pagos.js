import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { clientesConDeuda, deudaDeCliente } from '../../services/clientes.service.js';
import * as servicioPagos from '../../services/pagos.service.js';

let documento;

// Lista de opciones; si no hay nadie con saldo se muestra un texto que lo explica
const opciones = (plantilla, elementos, textoVacio) => (elementos.length
  ? repetir(documento, plantilla, elementos)
  : repetir(documento, 'opcion-vacia', [{ texto: textoVacio }]));

export async function dibujar() {
  documento = await cargarHtml(new URL('./pagos.html', import.meta.url));
  const metodos = servicioPagos.metodosDePago().map((metodo) => ({ metodo }));
  const clientes = clientesConDeuda().map((cliente) => ({ id: cliente.id, nombre: cliente.nombre, pendiente: deudaDeCliente(cliente) }));
  const proveedores = servicioPagos.proveedoresConSaldo();
  const filas = estado.pagos.slice().reverse().map((pago) => ({
    id: pago.id,
    fecha: aFecha(pago.fecha),
    tipo: pago.tipo === 'abono' ? 'Abono de cliente' : 'Pago a proveedor',
    tercero: pago.tercero,
    concepto: pago.concepto,
    metodo: pago.metodo,
    valor: aPesos(pago.valor),
  }));
  return seccion(documento, 'principal', {
    opcionesClientes: opciones('opcion-cliente', clientes, 'Ningún cliente tiene deuda'),
    opcionesProveedores: opciones('opcion-proveedor', proveedores, 'Ningún proveedor tiene saldo'),
    opcionesMetodo: repetir(documento, 'opcion-metodo', metodos),
    filas: repetir(documento, 'fila-pago', filas),
    sinPagos: filas.length ? '' : repetir(documento, 'aviso-vacio', [{ texto: 'Aún no hay pagos registrados.' }]),
  });
}

export function montar(raiz, contexto) {
  const valorDe = (selector) => buscar(selector, raiz).value;

  // Muestra lo pendiente de la persona elegida en cada lista
  const mostrarPendiente = (selector, destino, etiqueta) => {
    const elegida = buscar(`${selector} option:checked`, raiz);
    buscar(destino, raiz).textContent = elegida?.dataset.pendiente
      ? `${etiqueta}: ${aPesos(Number(elegida.dataset.pendiente))}`
      : '';
  };
  const pintarPendientes = () => {
    mostrarPendiente('#abono-cliente', '#deuda-seleccionada', 'Deuda actual');
    mostrarPendiente('#pago-proveedor', '#saldo-seleccionado', 'Pendiente por pagar');
  };
  buscar('#abono-cliente', raiz).onchange = pintarPendientes;
  buscar('#pago-proveedor', raiz).onchange = pintarPendientes;
  pintarPendientes();

  const ejecutar = (accion, mensaje) => {
    try {
      accion();
      contexto.aviso(mensaje);
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  buscar('#registrar-abono', raiz).onclick = () => ejecutar(() => servicioPagos.registrarAbono({
    clienteId: valorDe('#abono-cliente'),
    valor: leerEntero(valorDe('#abono-valor')),
    metodo: valorDe('#abono-metodo'),
  }), 'Abono registrado correctamente');

  buscar('#registrar-pago', raiz).onclick = () => ejecutar(() => servicioPagos.registrarPagoProveedor({
    proveedor: valorDe('#pago-proveedor'),
    concepto: valorDe('#pago-concepto'),
    valor: leerEntero(valorDe('#pago-valor')),
    metodo: valorDe('#pago-metodo'),
  }), 'Pago al proveedor registrado correctamente');
}
