package co.generico.cliente;

/** Cliente con su deuda calculada: ventas a Crédito menos devoluciones a Crédito y abonos. */
public record Cliente(String codigo, String nombre, String telefono, String correo, String direccion, long deuda) {
}
