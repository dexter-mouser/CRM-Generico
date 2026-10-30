// Inventario <-> Excel (SheetJS, que expone el objeto global XLSX). Columnas: Producto, Precio, Stock (admite negativos)
export function exportarInventario(productos) {
  const hoja = XLSX.utils.json_to_sheet(productos.map((producto) => ({
    Producto: producto.nombre,
    Precio: producto.precio,
    Stock: producto.existencias,
  })));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Inventario');
  XLSX.writeFile(libro, 'inventario.xlsx');
}

export async function leerInventario(archivo) {
  const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
  return XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]])
    .map((fila) => ({
      nombre: String(fila.Producto ?? '').trim(),
      precio: parseFloat(fila.Precio) || 0,
      existencias: parseInt(fila.Stock) || 0,
    }))
    .filter((producto) => producto.nombre);
}
