// Panel "Ingresar factura de compra" del inventario. Tiene el mismo diseño de Registrar venta: proveedor, factura y
// bodega arriba, y debajo la cuadrícula de productos con una casilla de búsqueda bajo cada columna.
import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { icono, ICONO_PAPELERA } from '../../core/iconos.js';
import { repetir } from '../../core/template.js';
import { registrarFactura, existenciasEn, buscarProductoPorId } from '../../services/inventario.service.js';
import { saldoConProveedor } from '../../services/proveedores.service.js';
import { mostrarComprobanteDeFactura } from '../../components/recibo/comprobantes.js';
import { montarBuscadorCuadricula } from '../../components/buscador-cuadricula/buscador-cuadricula.js';

// Devuelve cargarOrden(orden): llena el panel con el proveedor y los productos de una orden de compra
export function montarFactura(raiz, contexto, documento, plantillasBuscador) {
  const panel = buscar('#panel-factura', raiz);
  const lineas = [];
  let ordenId = '';
  const cuerpo = buscar('#lineas-factura', panel);
  const proveedor = buscar('#factura-proveedor', panel);
  const bodega = buscar('#factura-bodega', panel);
  const subtotal = (linea) => linea.cantidad * linea.costoUnitario;

  const pintarTotal = () => {
    buscar('#total-factura', panel).textContent = aPesos(lineas.reduce((acumulado, linea) => acumulado + subtotal(linea), 0));
  };

  // Datos del proveedor elegido: NIT, plazo y lo que se le debe
  const pintarProveedor = () => {
    const elegido = estado.proveedores.find((candidato) => candidato.id === proveedor.value);
    const saldo = elegido ? saldoConProveedor(elegido.id) : 0;
    buscar('#ficha-proveedor-compra', panel).innerHTML = elegido ? repetir(documento, 'datos-proveedor-compra', [{
      nit: elegido.nit || '—',
      plazo: `${elegido.plazoDias ?? 0} días`,
      saldo: aPesos(saldo),
      claseSaldo: saldo > 0 ? 'con-deuda' : '',
    }]) : '';
  };

  // El stock de cada línea es el de la bodega a la que entra la factura
  const pintarLineas = () => {
    cuerpo.innerHTML = repetir(documento, 'fila-linea-factura', lineas.map((linea, posicion) => {
      const producto = buscarProductoPorId(linea.productoId);
      return {
        posicion,
        id: linea.productoId,
        referencia: producto?.referencia ?? '',
        nombre: linea.nombre,
        costoActual: aPesos(producto?.costo ?? 0),
        existencias: producto ? existenciasEn(producto, bodega.value) : 0,
        cantidad: linea.cantidad || '',
        costoUnitario: linea.costoUnitario || '',
        subtotal: aPesos(subtotal(linea)),
        icono: icono(ICONO_PAPELERA),
      };
    }));
    activarCamposNumericos(cuerpo);
    buscar('#sin-lineas-factura', panel).hidden = lineas.length > 0;
    pintarTotal();
  };

  // Al elegir un producto se agrega la línea y el cursor pasa a su cantidad
  const agregarProducto = (producto) => {
    if (producto.generico) return contexto.alerta(`${producto.nombre} no maneja stock: no se registra en compras`);
    let posicion = lineas.findIndex((linea) => linea.productoId === producto.id);
    if (posicion >= 0) lineas[posicion].cantidad += 1;
    else {
      lineas.push({ productoId: producto.id, nombre: producto.nombre, cantidad: 1, costoUnitario: producto.costo });
      posicion = lineas.length - 1;
    }
    pintarLineas();
    const campo = buscar(`[data-posicion="${posicion}"] [data-campo="cantidad"]`, cuerpo);
    campo.focus();
    campo.select();
  };
  montarBuscadorCuadricula(panel, { plantillas: plantillasBuscador, alElegir: agregarProducto });

  cuerpo.addEventListener('input', (evento) => {
    const campo = evento.target.closest('[data-campo]');
    if (!campo) return;
    const fila = campo.closest('.fila-linea');
    const linea = lineas[Number(fila.dataset.posicion)];
    linea[campo.dataset.campo] = leerEntero(campo.value);
    buscar('[data-subtotal]', fila).textContent = aPesos(subtotal(linea));
    pintarTotal();
  });

  // Enter pasa de la cantidad al costo y del costo a la búsqueda, para registrar sin usar el ratón
  cuerpo.addEventListener('keydown', (evento) => {
    const campo = evento.target.closest('[data-campo]');
    if (evento.key !== 'Enter' || !campo) return;
    evento.preventDefault();
    const siguiente = campo.dataset.campo === 'cantidad'
      ? buscar('[data-campo="costoUnitario"]', campo.closest('.fila-linea'))
      : buscar('[data-filtro="id"]', panel);
    siguiente.focus();
    siguiente.select?.();
  });

  cuerpo.addEventListener('click', (evento) => {
    const quitar = evento.target.closest('[data-quitar]');
    if (!quitar) return;
    lineas.splice(Number(quitar.closest('.fila-linea').dataset.posicion), 1);
    pintarLineas();
  });

  proveedor.onchange = pintarProveedor;
  bodega.onchange = pintarLineas;

  buscar('#vaciar-factura', panel).onclick = () => {
    lineas.length = 0;
    pintarLineas();
  };
  buscar('#cancelar-factura', panel).onclick = () => { panel.hidden = true; };

  buscar('#registrar-factura', panel).onclick = () => {
    try {
      const factura = registrarFactura({
        numero: buscar('#factura-numero', panel).value,
        proveedorId: proveedor.value,
        fecha: buscar('#factura-fecha', panel).value,
        bodegaId: bodega.value,
        ordenId,
        lineas,
      });
      contexto.aviso(`Factura ${factura.numero} registrada correctamente: inventario actualizado${factura.ordenId ? ` y orden ${factura.ordenId} recibida` : ''}`);
      history.replaceState(null, '', `${location.pathname}?seccion=compras`);
      contexto.redibujar();
      mostrarComprobanteDeFactura(factura);
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  pintarProveedor();
  pintarLineas();

  return (orden) => {
    ordenId = orden.id;
    proveedor.value = orden.proveedorId;
    proveedor.disabled = true;
    lineas.length = 0;
    orden.items.forEach((item) => lineas.push({ ...item }));
    buscar('#aviso-orden', panel).hidden = false;
    buscar('#texto-orden', panel).textContent = `Recibiendo la orden ${orden.id} de ${orden.proveedor}: revisa cantidades y costos según la factura y escribe su número.`;
    pintarProveedor();
    pintarLineas();
  };
}
