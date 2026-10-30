import { buscar, buscarTodos } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha, fechaDeHoy } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { agregarProducto, actualizarProducto, importarProductos } from '../../services/inventario.service.js';
import { descargarInventarioCsv, leerInventarioCsv } from '../../services/csv.service.js';
import { dibujarSelector } from '../../components/selector-productos/selector-productos.js';
import { montarFactura } from './factura.js';
import { mostrarComprobanteDeFactura } from '../../components/recibo/comprobantes.js';

const CAMPOS_NUMERICOS = ['costo', 'existencias'];
let documento;

export async function dibujar() {
  documento = await cargarHtml(new URL('./inventario.html', import.meta.url));
  const filas = estado.productos.map((producto, posicion) => ({
    ...producto,
    posicion,
    insignia: producto.existencias < 0 ? '<span class="insignia">Negativo</span>' : '',
  }));
  const filasFacturas = estado.facturas.map((factura, indice) => ({ factura, indice })).slice(-5).reverse().map(({ factura, indice }) => ({
    indice,
    numero: factura.numero,
    proveedor: factura.proveedor,
    fecha: aFecha(factura.fecha),
    productos: factura.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', '),
    total: aPesos(factura.total),
  }));
  return seccion(documento, 'principal', {
    hoy: fechaDeHoy(),
    selector: await dibujarSelector(),
    filas: repetir(documento, 'fila-producto', filas),
    filasFacturas: repetir(documento, 'fila-factura', filasFacturas),
  });
}

export function montar(raiz, contexto) {
  const valorDe = (selector) => buscar(selector, raiz).value;

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-factura]');
    if (boton) mostrarComprobanteDeFactura(estado.facturas[Number(boton.dataset.factura)]);
  });

  // Edición en línea de los productos existentes (el ID no se edita porque lo usan las ventas y facturas)
  buscarTodos('[data-campo]', raiz).forEach((campo) => {
    campo.onchange = () => {
      const producto = estado.productos[Number(campo.dataset.posicion)];
      const nombreCampo = campo.dataset.campo;
      try {
        actualizarProducto(producto.id, nombreCampo, CAMPOS_NUMERICOS.includes(nombreCampo) ? leerEntero(campo.value) : campo.value);
        contexto.aviso('Producto actualizado correctamente');
        if (nombreCampo === 'existencias') contexto.redibujar();
      } catch (error) {
        campo.value = producto[nombreCampo];
        contexto.alerta(error.message);
      }
    };
  });

  buscar('#agregar-producto', raiz).onclick = () => {
    try {
      agregarProducto({
        id: valorDe('#nuevo-id'),
        referencia: valorDe('#nuevo-referencia'),
        nombre: valorDe('#nuevo-nombre'),
        costo: leerEntero(valorDe('#nuevo-costo')),
        existencias: leerEntero(valorDe('#nuevo-stock')),
      });
      contexto.aviso('Producto agregado correctamente');
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  // Factura de compra: panel que se abre y se cierra con el botón
  const panelFactura = buscar('#panel-factura', raiz);
  const botonFactura = buscar('#abrir-factura', raiz);
  botonFactura.onclick = () => {
    panelFactura.hidden = !panelFactura.hidden;
    botonFactura.setAttribute('aria-expanded', String(!panelFactura.hidden));
    if (!panelFactura.hidden) buscar('#factura-proveedor', raiz).focus();
  };
  montarFactura(raiz, contexto, documento);

  // Documentos CSV: se abren y se importan directamente en las hojas de cálculo del navegador
  buscar('#descargar-csv', raiz).onclick = () => {
    descargarInventarioCsv(estado.productos);
    contexto.aviso('Documento CSV descargado correctamente');
  };

  buscar('#cargar-csv', raiz).onchange = async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    try {
      const { agregados, actualizados } = importarProductos(await leerInventarioCsv(archivo));
      contexto.aviso(`Documento cargado correctamente: ${agregados} nuevos, ${actualizados} actualizados`);
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message || 'No se pudo leer el documento');
    }
  };
}
