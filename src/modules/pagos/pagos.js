import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { clientesConDeuda, deudaDeCliente } from '../../services/clientes.service.js';
import * as servicioPagos from '../../services/pagos.service.js';
import { mostrarComprobanteDePago } from '../../components/recibo/comprobantes.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';

let documento;
let plantillasCuadricula;

// Lista de opciones; si no hay nadie con saldo se muestra un texto que lo explica
const opciones = (plantilla, elementos, textoVacio) => (elementos.length
  ? repetir(documento, plantilla, elementos)
  : repetir(documento, 'opcion-vacia', [{ texto: textoVacio }]));

export async function dibujar() {
  documento = await cargarHtml(new URL('./pagos.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  const metodos = servicioPagos.metodosDePago().map((metodo) => ({ metodo }));
  const clientes = clientesConDeuda().map((cliente) => ({ id: cliente.id, nombre: cliente.nombre, pendiente: deudaDeCliente(cliente) }));
  const proveedores = servicioPagos.proveedoresConSaldo();
  return seccion(documento, 'principal', {
    opcionesClientes: opciones('opcion-cliente', clientes, 'Ningún cliente tiene deuda'),
    opcionesProveedores: opciones('opcion-proveedor', proveedores, 'Ningún proveedor tiene saldo'),
    opcionesMetodo: repetir(documento, 'opcion-metodo', metodos),
  });
}

export function montar(raiz, contexto) {
  montarCuadricula(buscar('#cuadricula-pagos', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Historial de pagos',
    vacio: 'Aún no hay pagos registrados.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '84px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '130px' },
      { clave: 'tipo', titulo: 'Tipo', ancho: '140px' },
      { clave: 'tercero', titulo: 'Cliente o proveedor', ancho: 'minmax(0, 1fr)' },
      { clave: 'concepto', titulo: 'Concepto', ancho: 'minmax(0, 1fr)' },
      { clave: 'metodo', titulo: 'Método', ancho: '110px' },
      { clave: 'valor', titulo: 'Valor', ancho: '104px', alinear: 'derecha' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '130px', filtrable: false, html: (fila) => repetir(documento, 'accion-pago', [{ id: fila.id }]) },
    ],
    filas: estado.pagos.slice().reverse().map((pago) => ({
      id: pago.id,
      fecha: aFecha(pago.fecha),
      tipo: pago.tipo === 'abono' ? 'Abono de cliente' : 'Pago a proveedor',
      tercero: pago.tercero,
      concepto: pago.concepto,
      metodo: pago.metodo,
      valor: aPesos(pago.valor),
    })),
  });

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-comprobante]');
    if (boton) mostrarComprobanteDePago(estado.pagos.find((pago) => pago.id === boton.dataset.comprobante));
  });

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

  // Tras registrar un pago se abre su comprobante para imprimirlo
  const ejecutar = (accion, mensaje) => {
    try {
      const pago = accion();
      contexto.aviso(mensaje);
      contexto.redibujar();
      mostrarComprobanteDePago(pago);
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
