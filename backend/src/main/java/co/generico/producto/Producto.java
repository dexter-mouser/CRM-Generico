package co.generico.producto;

/** Producto del inventario. El stock admite valores negativos. */
public record Producto(String codigo, String referencia, String nombre, long costo, int existencias) {
}
