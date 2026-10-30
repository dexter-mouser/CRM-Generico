import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';
import { ultimoDiaCerrado } from './contabilidad.service.js';
import { exigirPermiso, nombreDeUsuario } from '../core/autorizacion.js';
import { exigirFecha, exigirTexto, validarLineas, validarProducto } from '../core/validacion.js';
import { registrarAuditoria } from './auditoria.service.js';

const quitarTildes = (texto) => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const buscarProductoPorId = (id) => estado.productos.find((producto) => producto.id === id);

// Cada palabra escrita debe aparecer en algún atributo: ID, nombre, referencia, costo o stock
export function buscarProductos(consulta = '') {
  const terminos = quitarTildes(consulta).split(/\s+/).filter(Boolean);
  return estado.productos.filter((producto) => {
    const texto = quitarTildes([producto.id, producto.nombre, producto.referencia, producto.costo, producto.existencias].join(' '));
    return terminos.every((termino) => texto.includes(termino));
  });
}

// Filtro por columna: cada casilla con texto debe coincidir con su atributo (id, referencia, nombre, costo, existencias)
export function filtrarProductos(filtros) {
  const condiciones = Object.entries(filtros).filter(([, texto]) => texto.trim());
  return estado.productos.filter((producto) =>
    condiciones.every(([columna, texto]) => quitarTildes(producto[columna]).includes(quitarTildes(texto.trim()))));
}

// Edición en línea de un campo de un producto (el ID no se edita porque lo usan las ventas y facturas)
export function actualizarProducto(id, campo, valor) {
  exigirPermiso('inventario', 'editar', 'editar productos');
  const producto = buscarProductoPorId(id);
  if (!producto) throw new Error('El producto no existe');
  if (!['referencia', 'nombre', 'costo', 'existencias'].includes(campo)) throw new Error('Ese campo no se puede editar');
  const limpio = validarProducto({ ...producto, [campo]: valor });
  producto[campo] = limpio[campo];
  registrarAuditoria('inventario', 'Producto editado', `${producto.id} · ${campo} = ${producto[campo]}`);
  guardarEstado();
}

// Código exacto (ID o referencia, sin importar mayúsculas): lo que escribe un lector de código de barras
export const buscarProductoPorCodigo = (codigo) => {
  const buscado = String(codigo).trim().toLowerCase();
  if (!buscado) return null;
  return estado.productos.find((producto) => producto.id.toLowerCase() === buscado || producto.referencia.toLowerCase() === buscado) ?? null;
};

export function agregarProducto(datos) {
  exigirPermiso('inventario', 'crear', 'crear productos');
  const limpio = validarProducto(datos);
  const idFinal = limpio.id || siguienteCodigo(estado.productos.map((producto) => producto.id), 'P', 3);
  if (buscarProductoPorId(idFinal)) throw new Error(`Ya existe un producto con el ID ${idFinal}`);
  const producto = { ...limpio, id: idFinal };
  estado.productos.push(producto);
  registrarAuditoria('inventario', 'Producto creado', `${producto.id} · ${producto.nombre}`);
  guardarEstado();
  return producto;
}

// Importación validada: se revisan todas las filas antes de cambiar nada; si alguna falla no se importa ninguna
export function importarProductos(filas) {
  exigirPermiso('inventario', 'crear', 'importar productos');
  if (!filas.length) throw new Error('El archivo no tiene productos');
  if (filas.length > 5000) throw new Error('El archivo tiene demasiadas filas (máximo 5000)');
  const problemas = [];
  const vistos = new Set();
  const validas = filas.map((fila, posicion) => {
    try {
      const limpia = validarProducto(fila);
      if (limpia.id && vistos.has(limpia.id.toLowerCase())) throw new Error(`el ID ${limpia.id} está repetido en el archivo`);
      if (limpia.id) vistos.add(limpia.id.toLowerCase());
      return limpia;
    } catch (error) {
      problemas.push(`Fila ${posicion + 2}: ${error.message}`);
      return null;
    }
  });
  if (problemas.length) {
    const resto = problemas.length > 3 ? ` (y ${problemas.length - 3} más)` : '';
    throw new Error(`No se importó nada. ${problemas.slice(0, 3).join(' · ')}${resto}`);
  }

  let agregados = 0, actualizados = 0;
  for (const fila of validas) {
    const existente = fila.id ? buscarProductoPorId(fila.id) : null;
    if (existente) {
      Object.assign(existente, { referencia: fila.referencia, nombre: fila.nombre, costo: fila.costo, existencias: fila.existencias });
      actualizados++;
    } else {
      const idFinal = fila.id || siguienteCodigo(estado.productos.map((producto) => producto.id), 'P', 3);
      estado.productos.push({ ...fila, id: idFinal });
      agregados++;
    }
  }
  registrarAuditoria('inventario', 'Inventario importado', `${agregados} nuevos, ${actualizados} actualizados`);
  guardarEstado();
  return { agregados, actualizados };
}

// Factura de compra: suma las cantidades al stock y deja el costo de la factura como costo del producto
export function registrarFactura(datos) {
  exigirPermiso('inventario', 'crear', 'registrar facturas de compra');
  const { lineas } = datos;
  const proveedor = exigirTexto(datos.proveedor, 'el proveedor');
  const numero = exigirTexto(datos.numero, 'el número de la factura', { maximo: 40 });
  const fecha = exigirFecha(datos.fecha, 'la fecha de la factura');
  if (!lineas.length) throw new Error('Agrega al menos un producto a la factura');
  validarLineas(lineas, 'costoUnitario', 'el costo unitario');
  if (fecha <= ultimoDiaCerrado()) throw new Error('Ese día ya tiene la contabilidad cerrada: elige una fecha posterior');
  const repetida = estado.facturas.some((factura) =>
    factura.numero === numero && factura.proveedor.toLowerCase() === proveedor.toLowerCase());
  if (repetida) throw new Error('Esa factura de ese proveedor ya fue ingresada');

  const items = lineas.map(({ productoId, nombre, cantidad, costoUnitario }) => ({ productoId, nombre, cantidad, costoUnitario }));
  const factura = {
    numero,
    proveedor,
    fecha,
    usuario: nombreDeUsuario(),
    items,
    total: items.reduce((acumulado, item) => acumulado + item.cantidad * item.costoUnitario, 0),
  };
  estado.facturas.push(factura);
  registrarAuditoria('inventario', 'Factura de compra', `${factura.numero} · ${factura.proveedor} · $ ${factura.total}`);
  items.forEach((item) => {
    const producto = buscarProductoPorId(item.productoId);
    if (producto) {
      producto.existencias += item.cantidad;
      producto.costo = item.costoUnitario;
    }
  });
  guardarEstado();
  return factura;
}
