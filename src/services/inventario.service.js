import { estado, guardarEstado } from '../core/store.js';
import { siguienteCodigo } from '../core/codigos.js';

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

export function agregarProducto({ id, referencia, nombre, costo, existencias }) {
  if (!nombre.trim()) throw new Error('Escribe el nombre del producto');
  const idFinal = id.trim() || siguienteCodigo(estado.productos.map((producto) => producto.id), 'P', 3);
  if (buscarProductoPorId(idFinal)) throw new Error(`Ya existe un producto con el ID ${idFinal}`);
  const producto = { id: idFinal, referencia: referencia.trim(), nombre: nombre.trim(), costo, existencias };
  estado.productos.push(producto);
  guardarEstado();
  return producto;
}

// Crea los productos nuevos y actualiza los que ya existen con el mismo ID
export function importarProductos(filas) {
  let agregados = 0, actualizados = 0;
  for (const fila of filas) {
    const existente = fila.id ? buscarProductoPorId(fila.id) : null;
    if (existente) {
      Object.assign(existente, { referencia: fila.referencia, nombre: fila.nombre, costo: fila.costo, existencias: fila.existencias });
      actualizados++;
    } else {
      agregarProducto({ ...fila, id: fila.id || '' });
      agregados++;
    }
  }
  guardarEstado();
  return { agregados, actualizados };
}

// Factura de compra: suma las cantidades al stock y deja el costo de la factura como costo del producto
export function registrarFactura({ numero, proveedor, fecha, lineas }) {
  if (!proveedor.trim()) throw new Error('Escribe el proveedor');
  if (!numero.trim()) throw new Error('Escribe el número de la factura');
  if (!fecha) throw new Error('Elige la fecha de la factura');
  if (!lineas.length) throw new Error('Agrega al menos un producto a la factura');
  const sinCantidad = lineas.find((linea) => !(linea.cantidad >= 1));
  if (sinCantidad) throw new Error(`La cantidad de ${sinCantidad.nombre} debe ser al menos 1`);
  const sinCosto = lineas.find((linea) => !(linea.costoUnitario > 0));
  if (sinCosto) throw new Error(`Escribe el costo unitario de ${sinCosto.nombre}`);
  const repetida = estado.facturas.some((factura) =>
    factura.numero === numero.trim() && factura.proveedor.toLowerCase() === proveedor.trim().toLowerCase());
  if (repetida) throw new Error('Esa factura de ese proveedor ya fue ingresada');

  const items = lineas.map(({ productoId, nombre, cantidad, costoUnitario }) => ({ productoId, nombre, cantidad, costoUnitario }));
  const factura = {
    numero: numero.trim(),
    proveedor: proveedor.trim(),
    fecha,
    items,
    total: items.reduce((acumulado, item) => acumulado + item.cantidad * item.costoUnitario, 0),
  };
  estado.facturas.push(factura);
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
