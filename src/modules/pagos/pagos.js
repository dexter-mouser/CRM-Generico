import { buscar, buscarTodos } from '../../core/dom.js';
import { puede } from '../../core/autorizacion.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { clientesConDeuda, deudaDeCliente } from '../../services/clientes.service.js';
import * as servicioPagos from '../../services/pagos.service.js';
import { mostrarComprobanteDePago } from '../../components/recibo/comprobantes.js';
import { enTiendaActiva, nombreDeTienda } from '../../core/tienda.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { cargarPlantillasFicha, crearFicha } from '../../components/ficha-registro/ficha-registro.js';

let documento;
let plantillasCuadricula;
let plantillasFicha;

// Lista de opciones; si no hay nadie con saldo se muestra un texto que lo explica
const opciones = (plantilla, elementos, textoVacio) => (elementos.length
  ? repetir(documento, plantilla, elementos)
  : repetir(documento, 'opcion-vacia', [{ texto: textoVacio }]));

// Cada parte de la página muestra sus pagos: abonos de clientes o pagos a proveedores
const TIPO_POR_SECCION = { abonos: 'abono', proveedores: 'proveedor' };

export async function dibujar(contexto) {
  documento = await cargarHtml(new URL('./pagos.html', import.meta.url));
  [plantillasCuadricula, plantillasFicha] = await Promise.all([cargarPlantillasCuadricula(), cargarPlantillasFicha()]);
  const metodos = servicioPagos.metodosDePago().map((metodo) => ({ metodo }));
  const clientes = clientesConDeuda().map((cliente) => ({ id: cliente.id, nombre: cliente.nombre, pendiente: deudaDeCliente(cliente) }));
  const proveedores = servicioPagos.proveedoresConSaldo();
  return seccion(documento, 'principal', {
    opcionesClientes: opciones('opcion-cliente', clientes, 'Ningún cliente tiene deuda'),
    opcionesProveedores: opciones('opcion-proveedor', proveedores, 'Ningún proveedor tiene saldo'),
    opcionesMetodo: repetir(documento, 'opcion-metodo', metodos),
    tituloHistorial: contexto.seccion === 'proveedores' ? 'Pagos a proveedores' : 'Abonos de clientes',
  });
}

export function montar(raiz, contexto) {
  const tipo = TIPO_POR_SECCION[contexto.seccion] ?? 'abono';
  montarCuadricula(buscar('#cuadricula-pagos', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Historial de pagos',
    vacio: 'Aún no hay pagos registrados.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '84px' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '130px' },
      { clave: 'tercero', titulo: tipo === 'abono' ? 'Cliente' : 'Proveedor', ancho: 'minmax(0, 1fr)' },
      { clave: 'concepto', titulo: 'Concepto', ancho: 'minmax(0, 1fr)' },
      { clave: 'metodo', titulo: 'Método', ancho: '110px' },
      { clave: 'valor', titulo: 'Valor', ancho: '104px', alinear: 'derecha' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '200px', filtrable: false, html: (fila) => repetir(documento, 'accion-pago', [{ id: fila.id }]) },
    ],
    filas: estado.pagos.filter((pago) => enTiendaActiva(pago) && pago.tipo === tipo).reverse().map((pago) => ({
      id: pago.id,
      fecha: aFecha(pago.fecha),
      tercero: pago.tercero,
      concepto: pago.concepto,
      metodo: pago.metodo,
      valor: aPesos(pago.valor),
    })),
  });

  // Ficha del pago (no se edita: mueve caja y deuda)
  const ficha = crearFicha(buscar('#ficha-pago', raiz), plantillasFicha);
  const abrirFicha = (id) => ficha.abrir(id, () => {
    const pago = estado.pagos.find((candidato) => candidato.id === id);
    if (!pago) return null;
    const esAbono = pago.tipo === 'abono';
    return {
      etiqueta: esAbono ? 'Ficha del abono' : 'Ficha del pago a proveedor',
      titulo: `${pago.id} · ${pago.tercero}`,
      subtitulo: `${esAbono ? 'Abono de cliente' : 'Pago a proveedor'} · ${pago.metodo}`,
      indicadores: [{ etiqueta: 'Valor', valor: aPesos(pago.valor) }],
      datos: [
        { etiqueta: esAbono ? 'Cliente' : 'Proveedor', valor: `${pago.tercero} · ${pago.terceroId}` },
        { etiqueta: 'Fecha', valor: aFecha(pago.fecha) },
        { etiqueta: 'Método', valor: pago.metodo },
        { etiqueta: 'Tienda', valor: pago.tiendaId ? nombreDeTienda(pago.tiendaId) : '' },
        { etiqueta: 'Registró', valor: pago.usuario ?? '' },
        { etiqueta: 'Concepto', valor: pago.concepto ?? '', ancho: true },
      ],
      acciones: repetir(documento, 'comprobante-pago', [{ id: pago.id }]),
    };
  });

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const fichaBoton = evento.target.closest('[data-ficha]');
    if (fichaBoton) return abrirFicha(fichaBoton.dataset.ficha);
    const boton = evento.target.closest('[data-comprobante]');
    if (boton) mostrarComprobanteDePago(estado.pagos.find((pago) => pago.id === boton.dataset.comprobante));
  });

  // Paneles de proceso: se abren con el botón de la cabecera
  ['#panel-abono', '#panel-pago'].forEach((selector) => { buscar(selector, raiz).hidden = true; });
  const abrirPanel = (selector) => {
    const panel = buscar(selector, raiz);
    panel.hidden = false;
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    panel.querySelector('select')?.focus();
  };
  if (!puede('pagos', 'crear')) ['#nuevo-abono', '#nuevo-pago'].forEach((selector) => { buscar(selector, raiz).hidden = true; });
  buscar('#nuevo-abono', raiz).onclick = () => abrirPanel('#panel-abono');
  buscar('#nuevo-pago', raiz).onclick = () => abrirPanel('#panel-pago');
  buscarTodos('[data-cancelar]', raiz).forEach((boton) => { boton.onclick = () => { buscar(boton.dataset.cancelar, raiz).hidden = true; }; });

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
    proveedorId: valorDe('#pago-proveedor'),
    concepto: valorDe('#pago-concepto'),
    valor: leerEntero(valorDe('#pago-valor')),
    metodo: valorDe('#pago-metodo'),
  }), 'Pago al proveedor registrado correctamente');
}
