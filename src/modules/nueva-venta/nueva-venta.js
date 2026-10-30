import { buscar, buscarTodos } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { buscarProductoPorCodigo } from '../../services/inventario.service.js';
import { armarVenta, registrarVenta, ultimoValorDeVenta, buscarDocumento, documentoPendiente, TIPOS_DOCUMENTO } from '../../services/ventas.service.js';
import { cargarPlantillasBuscador, montarBuscadorCuadricula } from '../../components/buscador-cuadricula/buscador-cuadricula.js';
import { mostrarReciboDeVenta as mostrarRecibo } from '../../components/recibo/comprobantes.js';

let documento;
let plantillasBuscador;
let escuchaTeclado = null;

const DESCRIPCIONES = {
  factura: 'Cuenta como venta, descuenta el stock y mueve la caja o la deuda del cliente.',
  remision: 'Entrega la mercancía y descuenta el stock sin cobrar. Después se pasa a factura desde Ventas.',
  cotizacion: 'Oferta con vigencia de 15 días. No descuenta stock ni registra dinero.',
};
const TEXTO_REGISTRAR = { factura: 'Registrar factura', remision: 'Registrar remisión', cotizacion: 'Guardar cotización' };
const DENOMINACIONES = [1000, 10000, 50000, 100000];

// Un lector de códigos teclea muy rápido (menos de 50 ms entre teclas) y termina con Enter
const MILISEGUNDOS_ENTRE_TECLAS_DE_LECTOR = 50;
const LARGO_MINIMO_CODIGO = 3;

export async function dibujar() {
  documento = await cargarHtml(new URL('./nueva-venta.html', import.meta.url));
  plantillasBuscador = await cargarPlantillasBuscador();
  const metodos = estado.ajustes.ventas.metodosPago.map((metodo) => ({ metodo }));
  return seccion(documento, 'principal', {
    opcionesMetodo: repetir(documento, 'opcion-metodo', metodos),
    opcionesCliente: repetir(documento, 'opcion-cliente', estado.clientes),
  });
}

export function montar(raiz, contexto) {
  const lineas = [];
  const contenedorLineas = buscar('#lineas-venta', raiz);
  let ventaRegistrada = null;
  let tipo = 'factura';
  let documentoOrigen = '';
  const subtotal = (linea) => linea.cantidad * linea.valorUnitario;
  const totalActual = () => lineas.reduce((acumulado, linea) => acumulado + subtotal(linea), 0);
  const datosDeVenta = () => ({
    tipo,
    cliente: buscar('#cliente', raiz).value,
    metodo: buscar('#metodo', raiz).value,
    observaciones: buscar('#observaciones', raiz).value,
    recibido: leerEntero(buscar('#monto-recibido', raiz).value),
    documentoOrigen,
    lineas,
  });

  // Pago en efectivo: montos rápidos (exacto y billetes que lo cubren) y devuelta calculada
  const pintarPago = () => {
    const efectivo = tipo === 'factura' && buscar('#metodo', raiz).value === 'Efectivo';
    buscar('#pago-efectivo', raiz).hidden = !efectivo;
    if (!efectivo) return;
    const total = totalActual();
    const redondeos = DENOMINACIONES.map((paso) => Math.ceil(total / paso) * paso).filter((valor) => valor > total);
    const montos = [total, ...new Set(redondeos)].slice(0, 5).filter((valor) => valor > 0);
    const recibido = leerEntero(buscar('#monto-recibido', raiz).value);
    buscar('#fichas-monto', raiz).innerHTML = repetir(documento, 'ficha-monto', montos.map((valor) => ({
      valor,
      texto: valor === total ? `Exacto ${aPesos(valor)}` : aPesos(valor),
    })));
    buscarTodos('[data-monto]', raiz).forEach((ficha) => ficha.setAttribute('aria-pressed', String(recibido === Number(ficha.dataset.monto))));
    const diferencia = (recibido || total) - total;
    buscar('#fila-devuelta span', raiz).textContent = diferencia < 0 ? 'Faltan' : 'Devuelta';
    buscar('#devuelta', raiz).textContent = aPesos(Math.abs(diferencia));
  };

  const pintarTotal = () => {
    buscar('#total-venta', raiz).textContent = aPesos(totalActual());
    pintarPago();
  };

  // Cambia entre factura, remisión y cotización: solo la factura cobra, así que solo ella pide método y monto
  const elegirTipo = (nuevo) => {
    tipo = nuevo;
    buscarTodos('[data-tipo]', raiz).forEach((boton) => boton.setAttribute('aria-pressed', String(boton.dataset.tipo === nuevo)));
    buscar('#descripcion-tipo', raiz).textContent = DESCRIPCIONES[nuevo];
    buscar('#texto-registrar', raiz).textContent = TEXTO_REGISTRAR[nuevo];
    buscar('#campo-metodo', raiz).hidden = nuevo !== 'factura';
    pintarPago();
  };

  const pintarLineas = () => {
    contenedorLineas.innerHTML = repetir(documento, 'fila-linea', lineas.map((linea, posicion) => ({
      posicion,
      id: linea.productoId,
      referencia: linea.referencia,
      nombre: linea.nombre,
      costo: aPesos(linea.costo),
      existencias: linea.existencias,
      cantidad: linea.cantidad || '',
      valorUnitario: linea.valorUnitario || '',
      subtotal: aPesos(subtotal(linea)),
      icono: icono(ICONO_PAPELERA),
    })));
    activarCamposNumericos(contenedorLineas);
    buscar('#sin-lineas', raiz).hidden = lineas.length > 0;
    pintarTotal();
  };

  // Al elegir un producto (o escanear su código) se agrega la línea y el cursor pasa a su cantidad para escribirla
  function agregarProducto(producto) {
    let posicion = lineas.findIndex((linea) => linea.productoId === producto.id);
    if (posicion >= 0) lineas[posicion].cantidad += 1;
    else {
      lineas.push({
        productoId: producto.id,
        referencia: producto.referencia,
        nombre: producto.nombre,
        costo: producto.costo,
        existencias: producto.existencias,
        cantidad: 1,
        valorUnitario: ultimoValorDeVenta(producto.id),
      });
      posicion = lineas.length - 1;
    }
    pintarLineas();
    const campoCantidad = buscar(`[data-posicion="${posicion}"] [data-campo="cantidad"]`, contenedorLineas);
    campoCantidad.focus();
    campoCantidad.select();
  }

  montarBuscadorCuadricula(raiz, { plantillas: plantillasBuscador, alElegir: agregarProducto });

  // Al escribir cantidad o valor solo se actualizan los subtotales, para no perder el foco del campo
  contenedorLineas.addEventListener('input', (evento) => {
    const campo = evento.target.closest('[data-campo]');
    if (!campo) return;
    const fila = campo.closest('.fila-linea');
    const linea = lineas[Number(fila.dataset.posicion)];
    linea[campo.dataset.campo] = leerEntero(campo.value);
    buscar('[data-subtotal]', fila).textContent = aPesos(subtotal(linea));
    pintarTotal();
  });

  // Enter pasa de la cantidad al valor y del valor a la búsqueda de ID, para registrar sin usar el ratón
  contenedorLineas.addEventListener('keydown', (evento) => {
    const campo = evento.target.closest('[data-campo]');
    if (evento.key !== 'Enter' || !campo) return;
    evento.preventDefault();
    const siguiente = campo.dataset.campo === 'cantidad'
      ? buscar('[data-campo="valorUnitario"]', campo.closest('.fila-linea'))
      : buscar('[data-filtro="id"]', raiz);
    siguiente.focus();
    siguiente.select?.();
  });

  contenedorLineas.addEventListener('click', (evento) => {
    const quitar = evento.target.closest('[data-quitar]');
    if (!quitar) return;
    lineas.splice(Number(quitar.closest('.fila-linea').dataset.posicion), 1);
    pintarLineas();
  });

  buscar('#vaciar-venta', raiz).onclick = () => {
    lineas.length = 0;
    pintarLineas();
  };

  buscar('#vista-previa-recibo', raiz).onclick = () => {
    try {
      mostrarRecibo(armarVenta(datosDeVenta()));
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  buscar('#registrar-venta', raiz).onclick = () => {
    try {
      ventaRegistrada = registrarVenta(datosDeVenta());
      const etiqueta = TIPOS_DOCUMENTO[ventaRegistrada.tipo].etiqueta;
      buscar('#cuadricula-venta', raiz).hidden = true;
      buscar('#venta-registrada', raiz).hidden = false;
      buscar('#titulo-registrada', raiz).textContent = `${etiqueta} ${ventaRegistrada.id} registrada correctamente`;
      const devuelta = ventaRegistrada.devuelta ? ` · Devuelta ${aPesos(ventaRegistrada.devuelta)}` : '';
      buscar('#resumen-registrada', raiz).textContent = `${ventaRegistrada.cliente} · ${aPesos(ventaRegistrada.total)}${devuelta}`;
      contexto.aviso(`${etiqueta} ${ventaRegistrada.id} registrada correctamente: ${aPesos(ventaRegistrada.total)}`);
      history.replaceState(null, '', location.pathname);
      buscar('#ver-recibo', raiz).focus();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  buscar('#ver-recibo', raiz).onclick = () => mostrarRecibo(ventaRegistrada);
  buscar('#otra-venta', raiz).onclick = () => contexto.redibujar();

  buscarTodos('[data-tipo]', raiz).forEach((boton) => { boton.onclick = () => elegirTipo(boton.dataset.tipo); });
  buscar('#metodo', raiz).onchange = pintarPago;
  buscar('#monto-recibido', raiz).addEventListener('input', pintarPago);
  buscar('#fichas-monto', raiz).addEventListener('click', (evento) => {
    const ficha = evento.target.closest('[data-monto]');
    if (!ficha) return;
    buscar('#monto-recibido', raiz).value = ficha.dataset.monto;
    pintarPago();
  });

  // Facturar una remisión o cotización: llega desde Ventas con ?documento=REM-0001
  const origen = buscarDocumento(new URLSearchParams(location.search).get('documento') ?? '');
  if (origen && documentoPendiente(origen)) {
    documentoOrigen = origen.id;
    origen.items.forEach((item) => {
      const producto = estado.productos.find((candidato) => candidato.id === item.productoId);
      lineas.push({ ...item, costo: producto?.costo ?? 0, existencias: producto?.existencias ?? 0 });
    });
    buscar('#cliente', raiz).value = origen.cliente === 'Cliente sin nombre' ? '' : origen.cliente;
    buscar('#observaciones', raiz).value = origen.observaciones ?? '';
    buscar('#aviso-origen', raiz).hidden = false;
    buscar('#texto-origen', raiz).textContent = `Pasando a factura: ${origen.id} · ${origen.cliente}`;
    buscarTodos('[data-tipo]:not([data-tipo="factura"])', raiz).forEach((boton) => { boton.disabled = true; });
  }

  montarAtajos(raiz, contexto, agregarProducto);

  elegirTipo('factura');
  pintarLineas();
}

// Atajos de teclado y lector de códigos de barras de Registrar venta.
//  F2 o /  buscar producto      F4 o Ctrl+Enter  registrar el documento (con el documento hecho, empezar otro)
//  F8      vista previa         F9               vaciar la venta          Esc  cerrar resultados
// El lector se detecta por la velocidad de tecleo (teclas casi simultáneas y Enter). Funciona con el cursor en la página,
// en la cantidad o el valor de una línea y en las casillas de búsqueda (ahí gana la coincidencia exacta de ID o referencia).
function montarAtajos(raiz, contexto, agregarProducto) {
  if (escuchaTeclado) removeEventListener('keydown', escuchaTeclado, true);
  let codigo = '';
  let ultimaTecla = 0;

  const pulsar = (selector) => {
    const boton = buscar(selector, raiz);
    if (boton && !boton.closest('[hidden]')) boton.click();
  };
  // Campos donde se escribe texto de verdad (cliente, método): el lector no actúa ahí
  const enCampoDeLaVenta = (destino) => destino.matches?.('input:not([data-filtro]):not([data-campo]), select, textarea');
  let valorAntesDelCodigo = '';

  escuchaTeclado = (evento) => {
    if (!raiz.isConnected || evento.altKey || document.querySelector('dialog[open]')) return;

    const atajos = { F2: () => buscar('[data-filtro="referencia"]', raiz).focus(), F4: () => cobrar(), F8: () => pulsar('#vista-previa-recibo'), F9: () => pulsar('#vaciar-venta') };
    const cobrar = () => pulsar(buscar('#cuadricula-venta', raiz).hidden ? '#otra-venta' : '#registrar-venta');
    if (atajos[evento.key]) {
      evento.preventDefault();
      return atajos[evento.key]();
    }
    if (evento.key === 'Enter' && evento.ctrlKey) {
      evento.preventDefault();
      return cobrar();
    }
    const enBusqueda = evento.target.matches?.('[data-filtro]');
    if (evento.key === '/' && !enCampoDeLaVenta(evento.target) && !enBusqueda && !evento.target.matches?.('[data-campo]')) {
      evento.preventDefault();
      return buscar('[data-filtro="referencia"]', raiz).focus();
    }

    // Lector de códigos: teclas rápidas seguidas de Enter. En las casillas de búsqueda ya lo resuelve el buscador
    if (enCampoDeLaVenta(evento.target) || enBusqueda) return;
    const ahora = performance.now();
    if (ahora - ultimaTecla > MILISEGUNDOS_ENTRE_TECLAS_DE_LECTOR) {
      codigo = '';
      valorAntesDelCodigo = evento.target.value ?? '';
    }
    ultimaTecla = ahora;
    if (evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey) {
      codigo += evento.key;
    } else if (evento.key === 'Enter' && codigo.length >= LARGO_MINIMO_CODIGO) {
      evento.preventDefault();
      evento.stopPropagation();
      const lectura = codigo;
      codigo = '';
      // Si el lector tecleó dentro de la cantidad o el valor, se devuelve lo que había antes del código
      if (evento.target.matches?.('[data-campo]')) {
        evento.target.value = valorAntesDelCodigo;
        evento.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const producto = buscarProductoPorCodigo(lectura);
      if (producto) agregarProducto(producto);
      else contexto.alerta(`No existe un producto con el código ${lectura}`);
    }
  };
  addEventListener('keydown', escuchaTeclado, true);
}
