import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { armarVenta, registrarVenta, ultimoValorDeVenta } from '../../services/ventas.service.js';
import { cargarPlantillasBuscador, montarBuscadorCuadricula } from '../../components/buscador-cuadricula/buscador-cuadricula.js';
import { mostrarRecibo } from '../../components/recibo/recibo.js';

let documento;
let plantillasBuscador;

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

  // Al elegir un producto se agrega la línea y el cursor pasa a su cantidad para escribirla
  montarBuscadorCuadricula(raiz, {
    plantillas: plantillasBuscador,
    alElegir: (producto) => {
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
    },
  });

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

  pintarLineas();
}
