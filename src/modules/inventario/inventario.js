import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha, fechaDeHoy } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { agregarProducto, actualizarProducto, importarProductos } from '../../services/inventario.service.js';
import { descargarInventarioCsv, leerInventarioCsv } from '../../services/csv.service.js';
import { dibujarSelector } from '../../components/selector-productos/selector-productos.js';
import { montarFactura } from './factura.js';
import { mostrarComprobanteDeFactura } from '../../components/recibo/comprobantes.js';

const CAMPOS_NUMERICOS = ['costo', 'existencias'];
let documento;
let plantillasCuadricula;

export async function dibujar() {
  documento = await cargarHtml(new URL('./inventario.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  return seccion(documento, 'principal', {
    hoy: fechaDeHoy(),
    selector: await dibujarSelector(),
  });
}

export function montar(raiz, contexto) {
  const valorDe = (selector) => buscar(selector, raiz).value;

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-factura]');
    if (boton) mostrarComprobanteDeFactura(estado.facturas[Number(boton.dataset.factura)]);
  });

  // Cuadrícula de productos con edición en línea (el ID no se edita porque lo usan las ventas y facturas)
  const campoDe = (producto, posicion, campo, etiqueta) => repetir(documento,
    CAMPOS_NUMERICOS.includes(campo) ? 'campo-producto-numero' : 'campo-producto-texto',
    [{ campo, posicion, etiqueta, nombre: producto.nombre, valor: producto[campo], tipo: campo === 'existencias' ? 'entero-negativo' : 'entero' }]);

  montarCuadricula(buscar('#cuadricula-productos', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Productos',
    vacio: 'Aún no hay productos. Agrega uno con "Nuevo producto".',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '84px' },
      { clave: 'referencia', titulo: 'Referencia', ancho: '124px', html: (fila) => campoDe(fila.producto, fila.posicion, 'referencia', 'Referencia') },
      { clave: 'nombre', titulo: 'Producto', ancho: 'minmax(0, 1.6fr)', html: (fila) => campoDe(fila.producto, fila.posicion, 'nombre', 'Nombre') },
      { clave: 'costo', titulo: 'Costo (COP)', ancho: '116px', html: (fila) => campoDe(fila.producto, fila.posicion, 'costo', 'Costo') },
      { clave: 'existencias', titulo: 'Stock', ancho: '84px', html: (fila) => campoDe(fila.producto, fila.posicion, 'existencias', 'Stock') },
      { clave: 'estado', titulo: 'Estado', ancho: '90px', html: (fila) => (fila.estado ? '<span class="insignia">Negativo</span>' : '') },
    ],
    filas: estado.productos.map((producto, posicion) => ({ ...producto, producto, posicion, estado: producto.existencias < 0 ? 'Negativo' : '' })),
    alPintar: activarCamposNumericos,
  });

  buscar('#cuadricula-productos', raiz).addEventListener('change', (evento) => {
    const campo = evento.target.closest('[data-campo]');
    if (!campo) return;
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
  });

  montarCuadricula(buscar('#cuadricula-facturas-compra', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Facturas de compra',
    vacio: 'Aún no hay facturas de compra.',
    columnas: [
      { clave: 'numero', titulo: 'N°', ancho: '110px' },
      { clave: 'proveedor', titulo: 'Proveedor', ancho: 'minmax(0, 1fr)' },
      { clave: 'fecha', titulo: 'Fecha', ancho: '120px' },
      { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'total', titulo: 'Total', ancho: '112px', alinear: 'derecha' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '130px', filtrable: false, html: (fila) => repetir(documento, 'accion-factura-compra', [{ indice: fila.indice }]) },
    ],
    filas: estado.facturas.map((factura, indice) => ({
      indice,
      numero: factura.numero,
      proveedor: factura.proveedor,
      fecha: aFecha(factura.fecha),
      productos: factura.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', '),
      total: aPesos(factura.total),
    })).reverse(),
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
