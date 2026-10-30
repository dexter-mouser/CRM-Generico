package co.generico.cliente;

/** Cliente con su deuda calculada: ventas a Fiado menos devoluciones a Fiado y abonos. */
public record Cliente(String codigo, String nombre, String telefono, String correo, String direccion, long deuda) {
}
