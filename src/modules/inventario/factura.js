// Panel "Ingresar factura de compra" del inventario
import { buscar } from '../../core/dom.js';
import { aPesos } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { repetir } from '../../core/template.js';
import { registrarFactura } from '../../services/inventario.service.js';
import { mostrarComprobanteDeFactura } from '../../components/recibo/comprobantes.js';
import { montarSelectorProductos } from '../../components/selector-productos/selector-productos.js';

// Devuelve cargarOrden(orden): llena el panel con el proveedor y los productos de una orden de compra
export function montarFactura(raiz, contexto, documento) {
  const lineas = [];
  let ordenId = '';
  const cuerpo = buscar('#lineas-factura', raiz);
  const subtotal = (linea) => linea.cantidad * linea.costoUnitario;

  const pintarTotal = () => {
    buscar('#total-factura', raiz).textContent = aPesos(lineas.reduce((acumulado, linea) => acumulado + subtotal(linea), 0));
  };

  const pintarLineas = () => {
    cuerpo.innerHTML = repetir(documento, 'fila-linea-factura', lineas.map((linea, posicion) => ({
      posicion,
      id: linea.productoId,
      nombre: linea.nombre,
      cantidad: linea.cantidad || '',
      costoUnitario: linea.costoUnitario || '',
      subtotal: aPesos(subtotal(linea)),
      icono: icono(ICONO_PAPELERA),
    })));
    activarCamposNumericos(cuerpo);
    buscar('#sin-lineas-factura', raiz).hidden = lineas.length > 0;
    pintarTotal();
  };

  montarSelectorProductos(raiz, {
    alElegir: (producto) => {
      const existente = lineas.find((linea) => linea.productoId === producto.id);
      if (existente) existente.cantidad += 1;
      else lineas.push({ productoId: producto.id, nombre: producto.nombre, cantidad: 1, costoUnitario: producto.costo });
      pintarLineas();
    },
  });

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

  buscar('#vaciar-factura', raiz).onclick = () => {
    lineas.length = 0;
    pintarLineas();
  };

  buscar('#registrar-factura', raiz).onclick = () => {
    try {
      const factura = registrarFactura({
        numero: buscar('#factura-numero', raiz).value,
        proveedorId: buscar('#factura-proveedor', raiz).value,
        fecha: buscar('#factura-fecha', raiz).value,
        ordenId,
        lineas,
      });
      contexto.aviso(`Factura ${factura.numero} registrada correctamente: inventario actualizado${factura.ordenId ? ` y orden ${factura.ordenId} recibida` : ''}`);
      history.replaceState(null, '', location.pathname);
      contexto.redibujar();
      mostrarComprobanteDeFactura(factura);
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  pintarLineas();

  return (orden) => {
    ordenId = orden.id;
    buscar('#factura-proveedor', raiz).value = orden.proveedorId;
    buscar('#factura-proveedor', raiz).disabled = true;
    lineas.length = 0;
    orden.items.forEach((item) => lineas.push({ ...item }));
    buscar('#aviso-orden', raiz).hidden = false;
    buscar('#texto-orden', raiz).textContent = `Recibiendo la orden ${orden.id} de ${orden.proveedor}: revisa cantidades y costos según la factura y escribe su número.`;
    pintarLineas();
  };
}
