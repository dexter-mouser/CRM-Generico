import { buscar, escaparHtml } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha, fechaDeHoy } from '../../core/format.js';
import { leerEntero, activarCamposNumericos } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { agregarProducto, actualizarProducto, importarProductos, kardexDeProducto, buscarProductoPorId, categorias, bodegaActiva, existenciasVisibles, buscarBodega } from '../../services/inventario.service.js';
import { bodegasActivas } from '../../services/bodegas.service.js';
import { TARIFAS_IVA } from '../../core/validacion.js';
import { buscarOrden } from '../../services/proveedores.service.js';
import { descargarInventarioCsv, leerInventarioCsv } from '../../services/csv.service.js';
import { dibujarSelector } from '../../components/selector-productos/selector-productos.js';
import { montarFactura } from './factura.js';
import { mostrarComprobanteDeFactura } from '../../components/recibo/comprobantes.js';

const CAMPOS_NUMERICOS = ['costo', 'precio', 'stockMinimo', 'existencias'];
let documento;
let plantillasCuadricula;

export async function dibujar() {
  documento = await cargarHtml(new URL('./inventario.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  const bodega = bodegaActiva();
  const activas = bodegasActivas();
  const opcionesBodega = (elegida) => activas.map((una) => ({ valor: una.id, texto: una.nombre, seleccion: una.id === elegida ? 'selected' : '' }));
  return seccion(documento, 'principal', {
    lugarStock: bodega
      ? `Productos, compras y kardex. El stock que ves y editas es el de <strong>${escaparHtml(bodega.nombre)}</strong>, la bodega de la tienda activa.`
      : 'Productos, compras y kardex. Con "Todas las tiendas" ves el stock total; elige una tienda en el menú superior para editarlo.',
    opcionesBodegaFactura: repetir(documento, 'opcion-elegida', opcionesBodega(bodega?.id ?? activas[0]?.id)),
    opcionesBodegaKardex: repetir(documento, 'opcion-elegida', [{ valor: '', texto: 'Todas las bodegas', seleccion: bodega ? '' : 'selected' }, ...opcionesBodega(bodega?.id)]),
    opcionesProducto: repetir(documento, 'opcion', estado.productos.map((producto) => ({ valor: producto.id, texto: `${producto.id} · ${producto.nombre}` }))),
    hoy: fechaDeHoy(),
    selector: await dibujarSelector(),
    opcionesProveedor: repetir(documento, 'opcion', estado.proveedores.map((proveedor) => ({ valor: proveedor.id, texto: `${proveedor.nombre} · ${proveedor.id}` }))),
    opcionesCategoria: repetir(documento, 'opcion', categorias().map((categoria) => ({ valor: categoria, texto: categoria }))),
    opcionesIva: repetir(documento, 'opcion-iva', TARIFAS_IVA.map((valor) => ({ valor, seleccion: valor === 19 ? 'selected' : '' }))),
  });
}

export function montar(raiz, contexto) {
  const valorDe = (selector) => buscar(selector, raiz).value;

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-factura]');
    if (boton) mostrarComprobanteDeFactura(estado.facturas[Number(boton.dataset.factura)]);
  });
  const bodega = bodegaActiva();

  // Cuadrícula de productos con edición en línea (el ID no se edita porque lo usan las ventas y facturas)
  const campoDe = (producto, posicion, campo, etiqueta) => repetir(documento,
    CAMPOS_NUMERICOS.includes(campo) ? 'campo-producto-numero' : 'campo-producto-texto',
    [{ campo, posicion, etiqueta, nombre: producto.nombre, valor: producto[campo] ?? '', tipo: campo === 'existencias' ? 'entero-negativo' : 'entero' }]);
  const campoIva = (producto, posicion) => repetir(documento, 'campo-producto-iva', [{
    posicion,
    nombre: producto.nombre,
    opciones: repetir(documento, 'opcion-iva', TARIFAS_IVA.map((valor) => ({ valor, seleccion: valor === producto.iva ? 'selected' : '' }))),
  }]);

  montarCuadricula(buscar('#cuadricula-productos', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Productos',
    vacio: 'Aún no hay productos. Agrega uno con "Nuevo producto".',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '60px' },
      { clave: 'referencia', titulo: 'Referencia', ancho: '116px', html: (fila) => campoDe(fila.producto, fila.posicion, 'referencia', 'Referencia') },
      { clave: 'nombre', titulo: 'Producto', ancho: 'minmax(0, 1.6fr)', html: (fila) => campoDe(fila.producto, fila.posicion, 'nombre', 'Nombre') },
      { clave: 'categoria', titulo: 'Categoría', ancho: '116px', html: (fila) => campoDe(fila.producto, fila.posicion, 'categoria', 'Categoría') },
      { clave: 'costo', titulo: 'Costo', ancho: '100px', html: (fila) => campoDe(fila.producto, fila.posicion, 'costo', 'Costo') },
      { clave: 'precio', titulo: 'Precio con IVA', ancho: '108px', html: (fila) => campoDe(fila.producto, fila.posicion, 'precio', 'Precio') },
      { clave: 'iva', titulo: 'IVA', ancho: '84px', html: (fila) => campoIva(fila.producto, fila.posicion) },
      { clave: 'stockMinimo', titulo: 'Mínimo', ancho: '76px', html: (fila) => campoDe(fila.producto, fila.posicion, 'stockMinimo', 'Stock mínimo') },
      { clave: 'existencias', titulo: bodega ? 'Stock' : 'Stock total', ancho: '76px', html: (fila) => campoDe(fila.producto, fila.posicion, 'existencias', 'Stock') },
      { clave: 'estado', titulo: 'Estado', ancho: '96px', html: (fila) => (fila.estado ? `<span class="insignia">${fila.estado}</span>` : '') },
      { clave: 'acciones', titulo: '', ancho: '96px', filtrable: false, html: (fila) => repetir(documento, 'acciones-producto', [{ id: fila.id }]) },
    ],
    filas: estado.productos.map((original, posicion) => {
      // Stock de la bodega de la tienda activa (o el total con "Todas las tiendas")
      const producto = { ...original, existencias: existenciasVisibles(original) };
      return {
        ...producto,
        producto,
        posicion,
        estado: producto.existencias < 0 ? 'Negativo' : (producto.existencias <= (producto.stockMinimo ?? 0) ? 'Bajo mínimo' : ''),
      };
    }),
    alPintar: activarCamposNumericos,
  });

  buscar('#cuadricula-productos', raiz).addEventListener('change', (evento) => {
    const campo = evento.target.closest('[data-campo]');
    if (!campo) return;
    const producto = estado.productos[Number(campo.dataset.posicion)];
    const nombreCampo = campo.dataset.campo;
    try {
      const valor = CAMPOS_NUMERICOS.includes(nombreCampo) || nombreCampo === 'iva' ? leerEntero(campo.value) : campo.value;
      actualizarProducto(producto.id, nombreCampo, valor);
      contexto.aviso('Producto actualizado correctamente');
      if (nombreCampo === 'existencias' || nombreCampo === 'stockMinimo') contexto.redibujar();
    } catch (error) {
      campo.value = nombreCampo === 'existencias' ? existenciasVisibles(producto) : producto[nombreCampo];
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
      { clave: 'bodega', titulo: 'Bodega', ancho: '140px' },
      { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'total', titulo: 'Total', ancho: '112px', alinear: 'derecha' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '130px', filtrable: false, html: (fila) => repetir(documento, 'accion-factura-compra', [{ indice: fila.indice }]) },
    ],
    filas: estado.facturas.map((factura, indice) => ({
      indice,
      factura,
      numero: factura.numero,
      proveedor: factura.proveedor,
      fecha: aFecha(factura.fecha),
      bodega: buscarBodega(factura.bodegaId)?.nombre ?? '—',
      productos: factura.items.map((item) => `${item.nombre} ×${item.cantidad}`).join(', '),
      total: aPesos(factura.total),
    })).filter((fila) => !bodega || fila.factura.bodegaId === bodega.id).reverse(),
  });

  buscar('#agregar-producto', raiz).onclick = () => {
    try {
      agregarProducto({
        id: valorDe('#nuevo-id'),
        referencia: valorDe('#nuevo-referencia'),
        nombre: valorDe('#nuevo-nombre'),
        categoria: valorDe('#nuevo-categoria'),
        costo: leerEntero(valorDe('#nuevo-costo')),
        precio: leerEntero(valorDe('#nuevo-precio')),
        iva: leerEntero(valorDe('#nuevo-iva')),
        stockMinimo: leerEntero(valorDe('#nuevo-minimo')),
        existencias: leerEntero(valorDe('#nuevo-stock')),
      });
      contexto.aviso('Producto agregado correctamente');
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  // Factura de compra (sección Compras)
  const cargarOrden = montarFactura(raiz, contexto, documento);

  // Recibir una orden de compra: llega desde Proveedores con ?seccion=compras&orden=OC-0001
  const orden = buscarOrden(new URLSearchParams(location.search).get('orden') ?? '');
  if (orden?.estado === 'abierta' && contexto.seccion === 'compras') {
    cargarOrden(orden);
    buscar('#factura-numero', raiz).focus();
  }

  // Kardex de un producto, en una bodega o en todas (sección Kardex; ?producto=ID lo abre directo)
  const productoKardex = buscar('#kardex-producto', raiz);
  const bodegaKardex = buscar('#kardex-bodega', raiz);
  const pedido = new URLSearchParams(location.search).get('producto');
  if (pedido && buscarProductoPorId(pedido)) productoKardex.value = pedido;
  productoKardex.onchange = () => abrirKardex(productoKardex.value);
  bodegaKardex.onchange = () => abrirKardex(productoKardex.value);
  if (contexto.seccion === 'kardex' && productoKardex.value) abrirKardex(productoKardex.value);

  function abrirKardex(id) {
    const producto = buscarProductoPorId(id);
    if (!producto) return;
    const bodegaId = bodegaKardex.value || null;
    const lugar = bodegaId ? buscarBodega(bodegaId)?.nombre : 'todas las bodegas';
    buscar('#resumen-kardex', raiz).textContent = `${producto.nombre} · ID ${producto.id} · stock actual en ${lugar}: ${bodegaId ? (producto.stock?.[bodegaId] ?? 0) : producto.existencias}`;
    montarCuadricula(buscar('#cuadricula-kardex', raiz), {
      plantillas: plantillasCuadricula,
      titulo: 'Movimientos',
      vacio: 'Este producto aún no tiene movimientos.',
      columnas: [
        { clave: 'fecha', titulo: 'Fecha', ancho: '140px' },
        { clave: 'documento', titulo: 'Documento', ancho: '110px' },
        { clave: 'detalle', titulo: 'Detalle', ancho: 'minmax(0, 2fr)' },
        { clave: 'entrada', titulo: 'Entrada', ancho: '90px', alinear: 'derecha' },
        { clave: 'salida', titulo: 'Salida', ancho: '90px', alinear: 'derecha' },
        { clave: 'saldo', titulo: 'Saldo', ancho: '90px', alinear: 'derecha' },
        { clave: 'costo', titulo: 'Costo', ancho: '104px', alinear: 'derecha' },
      ],
      filas: kardexDeProducto(id, bodegaId).reverse().map((movimiento) => ({
        fecha: aFecha(movimiento.fecha),
        documento: movimiento.documento,
        detalle: movimiento.detalle,
        entrada: movimiento.cantidad > 0 ? movimiento.cantidad : '',
        salida: movimiento.cantidad < 0 ? -movimiento.cantidad : '',
        saldo: movimiento.saldo,
        costo: movimiento.costo === null ? '' : aPesos(movimiento.costo),
      })),
    });
  }

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
