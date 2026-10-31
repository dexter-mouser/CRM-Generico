package co.generico.venta;

import java.time.OffsetDateTime;
import java.util.List;

/** Formas de las respuestas de ventas y devoluciones. */
public final class VentaDto {

    private VentaDto() {
    }

    public record Item(String productoId, String nombre, int cantidad, long valorUnitario) {
    }

    public record Venta(String codigo, OffsetDateTime fecha, String cliente, String clienteCodigo, String metodo, String usuario, long total,
            long recibido, long devuelta, String observaciones, String documentoOrigen, boolean anulada, List<Item> items) {
    }

    public record Devolucion(String codigo, String ventaCodigo, OffsetDateTime fecha, String tipo, String motivo,
            String usuario, String cliente, String metodo, long total, List<Item> items) {
    }
}
