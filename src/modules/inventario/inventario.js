import { buscar, escaparHtml } from '../../core/dom.js';
import { puede } from '../../core/autorizacion.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha, fechaDeHoy } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { cargarPlantillasFicha, crearFicha } from '../../components/ficha-registro/ficha-registro.js';
import { agregarProducto, actualizarProducto, eliminarProducto, importarProductos, kardexDeProducto, buscarProductoPorId, categorias, bodegaActiva, existenciasVisibles, buscarBodega } from '../../services/inventario.service.js';
import { bodegasActivas } from '../../services/bodegas.service.js';
import { TARIFAS_IVA } from '../../core/validacion.js';
import { buscarOrden } from '../../services/proveedores.service.js';
import { descargarInventarioCsv, leerInventarioCsv } from '../../services/csv.service.js';
import { dibujarSelector } from '../../components/selector-productos/selector-productos.js';
import { montarFactura } from './factura.js';
import { mostrarComprobanteDeFactura } from '../../components/recibo/comprobantes.js';

const CAMPOS = ['referencia', 'nombre', 'categoria', 'costo', 'precio', 'iva', 'stockMinimo', 'existencias'];
const CAMPOS_NUMERICOS = ['costo', 'precio', 'iva', 'stockMinimo', 'existencias'];
let documento;
let plantillasCuadricula;
let plantillasFicha;

export async function dibujar() {
  documento = await cargarHtml(new URL('./inventario.html', import.meta.url));
  [plantillasCuadricula, plantillasFicha] = await Promise.all([cargarPlantillasCuadricula(), cargarPlantillasFicha()]);
  const bodega = bodegaActiva();
  const activas = bodegasActivas();
  const opcionesBodega = (elegida) => activas.map((una) => ({ valor: una.id, texto: una.nombre, seleccion: una.id === elegida ? 'selected' : '' }));
  return seccion(documento, 'principal', {
    lugarStock: bodega
      ? `El stock que ves y editas es el de <strong>${escaparHtml(bodega.nombre)}</strong>, la bodega de la tienda activa.`
      : 'Con "Todas las tiendas" ves el stock total; elige una tienda en el menú superior para editarlo.',
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
  const bodega = bodegaActiva();
  const ejecutar = (accion, mensaje) => {
    try {
      const resultado = accion();
      contexto.aviso(mensaje);
      return resultado ?? true;
    } catch (error) {
      contexto.alerta(error.message);
      return false;
    }
  };

  buscar('.vista', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-factura]');
    if (boton) mostrarComprobanteDeFactura(estado.facturas[Number(boton.dataset.factura)]);
  });

  // --- Productos: cuadrícula, formulario (nuevo o edición) y ficha -----------------------------------------
  const campo = (nombre) => buscar(`#producto-${nombre}`, raiz);
  const formulario = buscar('#formulario-producto', raiz);
  const ficha = crearFicha(buscar('#ficha-producto', raiz), plantillasFicha);
  let productoEnEdicion = null;
  formulario.hidden = true;
  // En una página dividida el router ya ocultó los botones de las otras partes: aquí solo se ocultan por permiso
  if (!puede('inventario', 'crear')) buscar('#nuevo-producto', raiz).hidden = true;

  const estadoDe = (producto) => (producto.existencias < 0 ? 'Negativo' : (producto.existencias <= (producto.stockMinimo ?? 0) ? 'Bajo mínimo' : ''));
  const botonEditar = (id) => (puede('inventario', 'editar') ? repetir(documento, 'boton-editar-producto', [{ id }]) : '');
  const botonEliminar = (id) => (puede('inventario', 'eliminar') ? repetir(documento, 'boton-eliminar-producto', [{ id }]) : '');

  const filasProductos = () => estado.productos.map((original) => {
    // Stock de la bodega de la tienda activa (o el total con "Todas las tiendas")
    const producto = { ...original, existencias: existenciasVisibles(original) };
    return {
      ...producto,
      costoTexto: aPesos(producto.costo),
      precioTexto: aPesos(producto.precio ?? 0),
      ivaTexto: `${producto.iva ?? 0} %`,
      existencias: String(producto.existencias),
      stockMinimo: String(producto.stockMinimo ?? 0),
      estado: estadoDe(producto),
    };
  });

  const cuadriculaProductos = montarCuadricula(buscar('#cuadricula-productos', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Productos',
    vacio: 'Aún no hay productos. Agrega uno con "Nuevo producto".',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '60px' },
      { clave: 'nombre', titulo: 'Producto', ancho: 'minmax(0, 1.6fr)' },
      { clave: 'categoria', titulo: 'Categoría', ancho: '110px' },
      { clave: 'costoTexto', titulo: 'Costo', ancho: '96px', alinear: 'derecha' },
      { clave: 'precioTexto', titulo: 'Precio con IVA', ancho: '110px', alinear: 'derecha' },
      { clave: 'existencias', titulo: bodega ? 'Stock' : 'Stock total', ancho: '70px', alinear: 'derecha' },
      { clave: 'estado', titulo: 'Estado', ancho: '100px', html: (fila) => (fila.estado ? repetir(documento, 'estado-producto', [{ texto: fila.estado }]) : '') },
      { clave: 'acciones', titulo: 'Acciones', ancho: '240px', filtrable: false, html: (fila) => repetir(documento, 'acciones-producto', [{ id: fila.id, editar: botonEditar(fila.id), eliminar: botonEliminar(fila.id) }]) },
    ],
    filas: filasProductos(),
  });
  const pintarProductos = () => cuadriculaProductos.actualizar(filasProductos());

  const abrirFormulario = (producto) => {
    productoEnEdicion = producto?.id ?? null;
    buscar('#titulo-formulario-producto', raiz).textContent = producto ? `Editar ${producto.nombre}` : 'Nuevo producto';
    campo('id').value = producto?.id ?? '';
    campo('id').disabled = Boolean(producto); // el ID no cambia: lo usan las ventas y las facturas
    CAMPOS.forEach((nombre) => { campo(nombre).value = producto?.[nombre] ?? ''; });
    if (!producto) campo('iva').value = '19';
    else campo('existencias').value = existenciasVisibles(producto);
    // Con "Todas las tiendas" el stock no se edita (no se sabe en qué bodega)
    campo('existencias').disabled = Boolean(producto) && !bodega;
    buscar('#etiqueta-existencias', raiz).textContent = producto
      ? (bodega ? `Stock en ${bodega.nombre}` : 'Stock total (elige una tienda para cambiarlo)')
      : 'Stock inicial (bodega de la tienda activa)';
    formulario.hidden = false;
    formulario.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    campo(producto ? 'nombre' : 'id').focus();
  };

  // Guarda solo los campos que cambiaron (cada cambio queda en la auditoría; el stock como ajuste del kardex)
  const guardarEdicion = (id) => {
    const producto = buscarProductoPorId(id);
    CAMPOS.forEach((nombre) => {
      if (nombre === 'existencias' && !bodega) return;
      const valor = CAMPOS_NUMERICOS.includes(nombre) ? leerEntero(campo(nombre).value) : campo(nombre).value.trim();
      const actual = nombre === 'existencias' ? existenciasVisibles(producto) : (producto[nombre] ?? (CAMPOS_NUMERICOS.includes(nombre) ? 0 : ''));
      if (valor !== actual) actualizarProducto(id, nombre, valor);
    });
  };

  buscar('#nuevo-producto', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-producto', raiz).onclick = () => { formulario.hidden = true; };
  buscar('#guardar-producto', raiz).onclick = () => {
    const editando = productoEnEdicion !== null;
    const aplicado = ejecutar(() => (editando
      ? guardarEdicion(productoEnEdicion)
      : agregarProducto({
        id: campo('id').value,
        ...Object.fromEntries(CAMPOS.map((nombre) => [nombre, CAMPOS_NUMERICOS.includes(nombre) ? leerEntero(campo(nombre).value) : campo(nombre).value])),
      })), editando ? 'Producto actualizado correctamente' : 'Producto agregado correctamente');
    if (!aplicado) return;
    formulario.hidden = true;
    pintarProductos();
    ficha.refrescar();
  };

  const abrirFicha = (id) => ficha.abrir(id, () => {
    const producto = buscarProductoPorId(id);
    if (!producto) return null;
    const visibles = existenciasVisibles(producto);
    return {
      etiqueta: 'Ficha del producto',
      titulo: `${producto.nombre} · ID ${producto.id}`,
      subtitulo: [producto.referencia && `Ref. ${producto.referencia}`, producto.categoria, estadoDe({ ...producto, existencias: visibles })].filter(Boolean).join(' · '),
      indicadores: [
        { etiqueta: bodega ? `Stock en ${bodega.nombre}` : 'Stock total', valor: String(visibles), clase: visibles < 0 ? 'texto-negativo' : '' },
        { etiqueta: 'Costo', valor: aPesos(producto.costo) },
        { etiqueta: 'Precio con IVA', valor: aPesos(producto.precio ?? 0) },
        { etiqueta: 'Valor del stock al costo', valor: aPesos(Math.max(0, producto.existencias) * producto.costo) },
      ],
      datos: [
        { etiqueta: 'Referencia', valor: producto.referencia ?? '' },
        { etiqueta: 'Categoría', valor: producto.categoria ?? '' },
        { etiqueta: 'IVA', valor: `${producto.iva ?? 0} %` },
        { etiqueta: 'Stock mínimo', valor: String(producto.stockMinimo ?? 0) },
        { etiqueta: 'Stock total', valor: String(producto.existencias) },
      ],
      contenido: repetir(documento, 'contenido-ficha-producto', [{}]),
      acciones: repetir(documento, 'enlace-kardex', [{ id: producto.id }]),
      alEditar: puede('inventario', 'editar') ? () => abrirFormulario(buscarProductoPorId(id)) : null,
      alMontar: (seccionFicha) => montarCuadricula(seccionFicha.querySelector('[data-stock]'), {
        plantillas: plantillasCuadricula,
        titulo: 'Stock por bodega',
        vacio: 'No hay bodegas.',
        columnas: [
          { clave: 'id', titulo: 'ID', ancho: '70px' },
          { clave: 'nombre', titulo: 'Bodega', ancho: 'minmax(0, 2fr)' },
          { clave: 'cantidad', titulo: 'Cantidad', ancho: '100px', alinear: 'derecha' },
        ],
        filas: bodegasActivas().map((una) => ({ id: una.id, nombre: una.nombre, cantidad: String(producto.stock?.[una.id] ?? 0) })),
      }),
    };
  });

  let productoPorEliminar = null;
  const confirmar = buscar('#confirmar-eliminar-producto', raiz);
  buscar('#cuadricula-productos', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    const producto = buscarProductoPorId(boton.dataset.ficha ?? boton.dataset.editar ?? boton.dataset.eliminar);
    if (!producto) return;
    if (boton.dataset.ficha) return abrirFicha(producto.id);
    if (boton.dataset.editar) return abrirFormulario(producto);
    productoPorEliminar = producto.id;
    buscar('#texto-eliminar-producto', raiz).textContent = `¿Eliminar ${producto.nombre}? Solo se puede si nunca se ha vendido, comprado ni trasladado y no tiene stock.`;
    confirmar.hidden = false;
    buscar('#eliminar-producto-no', raiz).focus();
  });
  buscar('#eliminar-producto-no', raiz).onclick = () => { confirmar.hidden = true; };
  buscar('#eliminar-producto-si', raiz).onclick = () => {
    confirmar.hidden = true;
    if (!ejecutar(() => eliminarProducto(productoPorEliminar), 'Producto eliminado correctamente')) return;
    if (ficha.idAbierto() === productoPorEliminar) ficha.cerrar();
    pintarProductos();
  };

  // --- Compras: facturas de compra con su ficha ------------------------------------------------------------
  const panelFactura = buscar('#panel-factura', raiz);
  panelFactura.hidden = true;
  if (!puede('inventario', 'crear')) buscar('#ingresar-compra', raiz).hidden = true;
  buscar('#ingresar-compra', raiz).onclick = () => {
    panelFactura.hidden = false;
    panelFactura.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    buscar('#factura-proveedor', raiz).focus();
  };

  const fichaFactura = crearFicha(buscar('#ficha-factura-compra', raiz), plantillasFicha);
  const abrirFichaFactura = (indice) => fichaFactura.abrir(indice, () => {
    const factura = estado.facturas[indice];
    if (!factura) return null;
    return {
      etiqueta: 'Ficha de la factura de compra',
      titulo: `Factura ${factura.numero} · ${factura.proveedor}`,
      subtitulo: `${aFecha(factura.fecha)} · ${buscarBodega(factura.bodegaId)?.nombre ?? '—'}`,
      indicadores: [
        { etiqueta: 'Total', valor: aPesos(factura.total) },
        { etiqueta: 'Unidades', valor: String(factura.items.reduce((suma, item) => suma + item.cantidad, 0)) },
      ],
      datos: [
        { etiqueta: 'Proveedor', valor: factura.proveedor },
        { etiqueta: 'Entró a la bodega', valor: buscarBodega(factura.bodegaId)?.nombre ?? '—' },
        { etiqueta: 'Orden de compra', valor: factura.ordenId ?? '' },
        { etiqueta: 'Registrada por', valor: factura.usuario ?? '' },
      ],
      contenido: repetir(documento, 'contenido-ficha-factura', [{}]),
      acciones: repetir(documento, 'comprobante-factura-compra', [{ indice }]),
      alMontar: (seccionFicha) => montarCuadricula(seccionFicha.querySelector('[data-items]'), {
        plantillas: plantillasCuadricula,
        titulo: 'Productos de la factura',
        columnas: [
          { clave: 'productoId', titulo: 'ID', ancho: '70px' },
          { clave: 'nombre', titulo: 'Producto', ancho: 'minmax(0, 2fr)' },
          { clave: 'cantidad', titulo: 'Cantidad', ancho: '90px', alinear: 'derecha' },
          { clave: 'costo', titulo: 'Costo unitario', ancho: '120px', alinear: 'derecha' },
          { clave: 'subtotal', titulo: 'Subtotal', ancho: '120px', alinear: 'derecha' },
        ],
        filas: factura.items.map((item) => ({ ...item, cantidad: String(item.cantidad), costo: aPesos(item.costoUnitario), subtotal: aPesos(item.cantidad * item.costoUnitario) })),
      }),
    };
  });
  buscar('#cuadricula-facturas-compra', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-ficha-factura]');
    if (boton) abrirFichaFactura(Number(boton.dataset.fichaFactura));
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
      { clave: 'acciones', titulo: 'Acciones', ancho: '210px', filtrable: false, html: (fila) => repetir(documento, 'accion-factura-compra', [{ indice: fila.indice }]) },
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

  // Factura de compra (sección Compras)
  const cargarOrden = montarFactura(raiz, contexto, documento);

  // Recibir una orden de compra: llega desde Proveedores con ?seccion=compras&orden=OC-0001
  const orden = buscarOrden(new URLSearchParams(location.search).get('orden') ?? '');
  if (orden?.estado === 'abierta' && contexto.seccion === 'compras') {
    panelFactura.hidden = false;
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
