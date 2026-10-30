import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { buscarProductoPorCodigo } from '../../services/inventario.service.js';
import { armarVenta, registrarVenta, ultimoValorDeVenta } from '../../services/ventas.service.js';
import { cargarPlantillasBuscador, montarBuscadorCuadricula } from '../../components/buscador-cuadricula/buscador-cuadricula.js';
import { mostrarReciboDeVenta as mostrarRecibo } from '../../components/recibo/comprobantes.js';

let documento;
let plantillasBuscador;
let escuchaTeclado = null;

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
  const subtotal = (linea) => linea.cantidad * linea.valorUnitario;
  const datosDeVenta = () => ({ cliente: buscar('#cliente', raiz).value, metodo: buscar('#metodo', raiz).value, lineas });

  const pintarTotal = () => {
    buscar('#total-venta', raiz).textContent = aPesos(lineas.reduce((acumulado, linea) => acumulado + subtotal(linea), 0));
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
      buscar('#cuadricula-venta', raiz).hidden = true;
      buscar('#venta-registrada', raiz).hidden = false;
      buscar('#resumen-registrada', raiz).textContent =
        `${ventaRegistrada.id} · ${ventaRegistrada.cliente} · ${aPesos(ventaRegistrada.total)}`;
      contexto.aviso(`Venta ${ventaRegistrada.id} registrada correctamente: ${aPesos(ventaRegistrada.total)}`);
      buscar('#ver-recibo', raiz).focus();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  buscar('#ver-recibo', raiz).onclick = () => mostrarRecibo(ventaRegistrada);
  buscar('#otra-venta', raiz).onclick = () => contexto.redibujar();

  montarAtajos(raiz, contexto, agregarProducto);

  pintarLineas();
}

// Atajos de teclado y lector de códigos de barras de Registrar venta.
//  F2 o /  buscar producto      F4 o Ctrl+Enter  cobrar (registrar la venta; con la venta hecha, empezar otra)
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
