import { buscar } from '../../core/dom.js';
import { aPesos } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { registrarVenta, ultimoValorDeVenta } from '../../services/ventas.service.js';
import { dibujarSelector, montarSelectorProductos } from '../../components/selector-productos/selector-productos.js';

let documento;

export async function dibujar() {
  documento = await cargarHtml(new URL('./nueva-venta.html', import.meta.url));
  return seccion(documento, 'principal', { selector: await dibujarSelector() });
}

export function montar(raiz, contexto) {
  const lineas = [];
  const cuerpo = buscar('#lineas-venta', raiz);
  const subtotal = (linea) => linea.cantidad * linea.valorUnitario;

  const pintarTotal = () => {
    buscar('#total-venta', raiz).textContent = aPesos(lineas.reduce((acumulado, linea) => acumulado + subtotal(linea), 0));
  };

  const pintarLineas = () => {
    cuerpo.innerHTML = repetir(documento, 'fila-linea', lineas.map((linea, posicion) => ({
      posicion,
      id: linea.productoId,
      nombre: linea.nombre,
      costo: aPesos(linea.costo),
      cantidad: linea.cantidad || '',
      valorUnitario: linea.valorUnitario || '',
      subtotal: aPesos(subtotal(linea)),
      icono: icono(ICONO_PAPELERA),
    })));
    activarCamposNumericos(cuerpo);
    buscar('#sin-lineas', raiz).hidden = lineas.length > 0;
    pintarTotal();
  };

  montarSelectorProductos(raiz, {
    alElegir: (producto) => {
      const existente = lineas.find((linea) => linea.productoId === producto.id);
      if (existente) existente.cantidad += 1;
      else {
        lineas.push({
          productoId: producto.id,
          nombre: producto.nombre,
          costo: producto.costo,
          cantidad: 1,
          valorUnitario: ultimoValorDeVenta(producto.id),
        });
      }
      pintarLineas();
    },
  });

  // Al escribir cantidad o valor solo se actualizan los subtotales, para no perder el foco del campo
  cuerpo.addEventListener('input', (evento) => {
    const campo = evento.target.closest('[data-campo]');
    if (!campo) return;
    const fila = campo.closest('tr');
    const linea = lineas[Number(fila.dataset.posicion)];
    linea[campo.dataset.campo] = leerEntero(campo.value);
    buscar('[data-subtotal]', fila).textContent = aPesos(subtotal(linea));
    pintarTotal();
  });

  cuerpo.addEventListener('click', (evento) => {
    const quitar = evento.target.closest('[data-quitar]');
    if (!quitar) return;
    lineas.splice(Number(quitar.closest('tr').dataset.posicion), 1);
    pintarLineas();
  });

  buscar('#vaciar-venta', raiz).onclick = () => {
    lineas.length = 0;
    pintarLineas();
  };

  buscar('#registrar-venta', raiz).onclick = () => {
    try {
      const venta = registrarVenta({
        cliente: buscar('#cliente', raiz).value,
        metodo: buscar('#metodo', raiz).value,
        lineas,
      });
      contexto.aviso(`Venta ${venta.id} registrada correctamente: ${aPesos(venta.total)}`);
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  pintarLineas();
}
