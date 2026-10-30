// Inventario <-> CSV. Es un documento de texto que abre y importa directamente cualquier hoja de cálculo del navegador.
// Columnas: ID, Referencia, Producto, Costo, Stock (el stock admite negativos).
import { leerEntero } from '../core/numeros.js';

const COLUMNAS = ['ID', 'Referencia', 'Producto', 'Costo', 'Stock'];

const escapar = (valor) => {
  const texto = String(valor ?? '');
  return /[",;\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export function descargarInventarioCsv(productos) {
  const filas = productos.map((producto) => [producto.id, producto.referencia, producto.nombre, producto.costo, producto.existencias]);
  const contenido = [COLUMNAS, ...filas].map((fila) => fila.map(escapar).join(',')).join('\r\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8' }));
  enlace.download = 'inventario.csv';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

function separarFilas(texto, delimitador) {
  const filas = [];
  let fila = [], campo = '', entreComillas = false;
  for (let posicion = 0; posicion < texto.length; posicion++) {
    const caracter = texto[posicion];
    if (entreComillas) {
      if (caracter === '"' && texto[posicion + 1] === '"') { campo += '"'; posicion++; }
      else if (caracter === '"') entreComillas = false;
      else campo += caracter;
    } else if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === delimitador) {
      fila.push(campo);
      campo = '';
    } else if (caracter === '\n' || caracter === '\r') {
      if (caracter === '\r' && texto[posicion + 1] === '\n') posicion++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += caracter;
    }
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((candidata) => candidata.some((celda) => celda.trim() !== ''));
}

export async function leerInventarioCsv(archivo) {
  const texto = (await archivo.text()).replace(/^\ufeff/, '');
  const primeraLinea = texto.split(/\r?\n/)[0] ?? '';
  const delimitador = (primeraLinea.match(/;/g) || []).length > (primeraLinea.match(/,/g) || []).length ? ';' : ',';
  const [encabezado = [], ...filas] = separarFilas(texto, delimitador);
  const columna = (...nombres) => encabezado.findIndex((titulo) => nombres.includes(titulo.trim().toLowerCase()));

  const posiciones = {
    id: columna('id'), referencia: columna('referencia'), nombre: columna('producto', 'nombre'),
    costo: columna('costo'), existencias: columna('stock', 'existencias'),
  };
  if (posiciones.nombre < 0) throw new Error('El archivo debe tener la columna Producto');

  const leer = (fila, clave) => (posiciones[clave] >= 0 ? (fila[posiciones[clave]] ?? '').trim() : '');
  return filas
    .map((fila) => ({
      id: leer(fila, 'id'),
      referencia: leer(fila, 'referencia'),
      nombre: leer(fila, 'nombre'),
      costo: leerEntero(leer(fila, 'costo')),
      existencias: leerEntero(leer(fila, 'existencias')),
    }))
    .filter((producto) => producto.nombre);
}

// Descarga cualquier tabla como CSV: columnas = ['Fecha', ...], filas = [[...], ...]
export function descargarCsv(nombreArchivo, columnas, filas) {
  const contenido = [columnas, ...filas].map((fila) => fila.map(escapar).join(',')).join('\r\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' }));
  enlace.download = nombreArchivo;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}
