package co.generico.venta;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class VentaRepositorio {

    private record VentaFila(String codigo, OffsetDateTime fecha, String cliente, String clienteCodigo, String metodo, String usuario, long total,
            long recibido, long devuelta, String observaciones, String documentoOrigen, boolean anulada) {
    }

    private record DevolucionFila(String codigo, String ventaCodigo, OffsetDateTime fecha, String tipo, String motivo,
            String usuario, String cliente, String metodo, long total) {
    }

    private record ItemFila(String padre, String productoCodigo, String nombre, int cantidad, long valorUnitario) {
    }

    public record ProductoBloqueado(String codigo, String nombre, int existencias) {
    }

    /** Lo que ya se devolvió de un producto de una venta. */
    public record Devuelto(String productoCodigo, long cantidad) {
    }

    private static final String SELECT_VENTA = """
            select v.codigo, v.fecha, v.cliente, coalesce(v.cliente_codigo, '') as cliente_codigo, v.metodo, v.usuario, v.total, v.recibido, v.devuelta, v.observaciones,
                   coalesce(v.documento_origen, '') as documento_origen,
                   exists (select 1 from devolucion d where d.tienda_id = v.tienda_id and d.venta_codigo = v.codigo and d.tipo = 'anulacion') as anulada
            from venta v
            """;

    private final JdbcClient jdbc;

    public VentaRepositorio(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // --- Consultas ---------------------------------------------------------------------------------------

    public List<VentaDto.Venta> listar(UUID tiendaId, LocalDate desde, LocalDate hasta, ZoneId zona) {
        OffsetDateTime inicio = (desde == null ? LocalDate.of(2000, 1, 1) : desde).atStartOfDay(zona).toOffsetDateTime();
        OffsetDateTime fin = (hasta == null ? LocalDate.of(2999, 12, 31) : hasta).plusDays(1).atStartOfDay(zona).toOffsetDateTime();
        List<VentaFila> filas = jdbc.sql(SELECT_VENTA + " where v.tienda_id = :tienda and v.fecha >= :inicio and v.fecha < :fin order by v.fecha desc limit 1000")
                .param("tienda", tiendaId).param("inicio", inicio).param("fin", fin)
                .query(VentaFila.class).list();
        return conItems(tiendaId, filas);
    }

    public Optional<VentaDto.Venta> buscar(UUID tiendaId, String codigo) {
        List<VentaFila> filas = jdbc.sql(SELECT_VENTA + " where v.tienda_id = :tienda and v.codigo = :codigo")
                .param("tienda", tiendaId).param("codigo", codigo)
                .query(VentaFila.class).list();
        return conItems(tiendaId, filas).stream().findFirst();
    }

    /** Bloquea la venta mientras dura la transacción: dos devoluciones simultáneas no se pisan. */
    public void bloquear(UUID tiendaId, String codigo) {
        jdbc.sql("select codigo from venta where tienda_id = :tienda and codigo = :codigo for update")
                .param("tienda", tiendaId).param("codigo", codigo)
                .query(String.class).list();
    }

    private List<VentaDto.Venta> conItems(UUID tiendaId, List<VentaFila> filas) {
        if (filas.isEmpty()) {
            return List.of();
        }
        List<String> codigos = filas.stream().map(VentaFila::codigo).toList();
        Map<String, List<VentaDto.Item>> items = jdbc.sql("""
                select venta_codigo as padre, producto_codigo, nombre, cantidad, valor_unitario from venta_item
                where tienda_id = :tienda and venta_codigo in (:codigos) order by venta_codigo, linea
                """)
                .param("tienda", tiendaId).param("codigos", codigos)
                .query(ItemFila.class).list().stream()
                .collect(Collectors.groupingBy(ItemFila::padre, LinkedHashMap::new,
                        Collectors.mapping(item -> new VentaDto.Item(item.productoCodigo(), item.nombre(), item.cantidad(), item.valorUnitario()),
                                Collectors.toList())));
        return filas.stream().map(fila -> new VentaDto.Venta(fila.codigo(), fila.fecha(), fila.cliente(), fila.clienteCodigo(), fila.metodo(), fila.usuario(),
                fila.total(), fila.recibido(), fila.devuelta(), fila.observaciones(), fila.documentoOrigen(), fila.anulada(), items.getOrDefault(fila.codigo(), List.of()))).toList();
    }

    public List<VentaDto.Devolucion> listarDevoluciones(UUID tiendaId) {
        List<DevolucionFila> filas = jdbc.sql("""
                select codigo, venta_codigo, fecha, tipo, motivo, usuario, cliente, metodo, total
                from devolucion where tienda_id = :tienda order by fecha desc limit 1000
                """)
                .param("tienda", tiendaId)
                .query(DevolucionFila.class).list();
        return conItemsDevolucion(tiendaId, filas);
    }

    public Optional<VentaDto.Devolucion> buscarDevolucion(UUID tiendaId, String codigo) {
        List<DevolucionFila> filas = jdbc.sql("""
                select codigo, venta_codigo, fecha, tipo, motivo, usuario, cliente, metodo, total
                from devolucion where tienda_id = :tienda and codigo = :codigo
                """)
                .param("tienda", tiendaId).param("codigo", codigo)
                .query(DevolucionFila.class).list();
        return conItemsDevolucion(tiendaId, filas).stream().findFirst();
    }

    private List<VentaDto.Devolucion> conItemsDevolucion(UUID tiendaId, List<DevolucionFila> filas) {
        if (filas.isEmpty()) {
            return List.of();
        }
        List<String> codigos = filas.stream().map(DevolucionFila::codigo).toList();
        Map<String, List<VentaDto.Item>> items = jdbc.sql("""
                select devolucion_codigo as padre, producto_codigo, nombre, cantidad, valor_unitario from devolucion_item
                where tienda_id = :tienda and devolucion_codigo in (:codigos) order by devolucion_codigo, linea
                """)
                .param("tienda", tiendaId).param("codigos", codigos)
                .query(ItemFila.class).list().stream()
                .collect(Collectors.groupingBy(ItemFila::padre,
                        Collectors.mapping(item -> new VentaDto.Item(item.productoCodigo(), item.nombre(), item.cantidad(), item.valorUnitario()),
                                Collectors.toList())));
        return filas.stream().map(fila -> new VentaDto.Devolucion(fila.codigo(), fila.ventaCodigo(), fila.fecha(), fila.tipo(), fila.motivo(),
                fila.usuario(), fila.cliente(), fila.metodo(), fila.total(), items.getOrDefault(fila.codigo(), List.of()))).toList();
    }

    public List<Devuelto> devuelto(UUID tiendaId, String ventaCodigo) {
        return jdbc.sql("""
                select i.producto_codigo, sum(i.cantidad)::bigint as cantidad
                from devolucion_item i join devolucion d on d.tienda_id = i.tienda_id and d.codigo = i.devolucion_codigo
                where d.tienda_id = :tienda and d.venta_codigo = :venta
                group by i.producto_codigo
                """)
                .param("tienda", tiendaId).param("venta", ventaCodigo)
                .query(Devuelto.class).list();
    }

    public List<ProductoBloqueado> bloquearProductos(UUID tiendaId, List<String> codigos) {
        return jdbc.sql("""
                select codigo, nombre, existencias from producto
                where tienda_id = :tienda and codigo in (:codigos) order by codigo for update
                """)
                .param("tienda", tiendaId).param("codigos", codigos)
                .query(ProductoBloqueado.class).list();
    }

    public LocalDate ultimoDiaCerrado(UUID tiendaId) {
        List<LocalDate> dias = jdbc.sql("select max(dia) from cierre_contable where tienda_id = :tienda")
                .param("tienda", tiendaId)
                .query((rs, fila) -> rs.getObject(1, LocalDate.class)).list();
        return dias.isEmpty() ? null : dias.get(0);
    }

    public boolean hayCajaAbierta(UUID tiendaId) {
        return jdbc.sql("select exists (select 1 from caja where tienda_id = :tienda and cierre_fecha is null)")
                .param("tienda", tiendaId).query(Boolean.class).single();
    }

    // --- Escritura ---------------------------------------------------------------------------------------

    public void insertarVenta(UUID tiendaId, String codigo, String cliente, String clienteCodigo, String metodo, String usuario, long total,
            long recibido, long devuelta, String observaciones) {
        jdbc.sql("""
                insert into venta (tienda_id, codigo, cliente, cliente_codigo, metodo, usuario, total, recibido, devuelta, observaciones)
                values (:tienda, :codigo, :cliente, :clienteCodigo, :metodo, :usuario, :total, :recibido, :devuelta, :observaciones)
                """)
                .param("tienda", tiendaId).param("codigo", codigo).param("cliente", cliente).param("clienteCodigo", clienteCodigo)
                .param("metodo", metodo).param("usuario", usuario).param("total", total)
                .param("recibido", recibido).param("devuelta", devuelta).param("observaciones", observaciones)
                .update();
    }

    public void insertarItemVenta(UUID tiendaId, String ventaCodigo, int linea, VentaDto.Item item) {
        jdbc.sql("""
                insert into venta_item (tienda_id, venta_codigo, linea, producto_codigo, nombre, cantidad, valor_unitario)
                values (:tienda, :venta, :linea, :producto, :nombre, :cantidad, :valor)
                """)
                .param("tienda", tiendaId).param("venta", ventaCodigo).param("linea", linea).param("producto", item.productoId())
                .param("nombre", item.nombre()).param("cantidad", item.cantidad()).param("valor", item.valorUnitario())
                .update();
    }

    public void insertarDevolucion(UUID tiendaId, String codigo, String ventaCodigo, String tipo, String motivo,
            String usuario, String cliente, String clienteCodigo, String metodo, long total) {
        jdbc.sql("""
                insert into devolucion (tienda_id, codigo, venta_codigo, tipo, motivo, usuario, cliente, cliente_codigo, metodo, total)
                values (:tienda, :codigo, :venta, :tipo, :motivo, :usuario, :cliente, :clienteCodigo, :metodo, :total)
                """)
                .param("tienda", tiendaId).param("codigo", codigo).param("venta", ventaCodigo).param("tipo", tipo)
                .param("motivo", motivo).param("usuario", usuario).param("cliente", cliente).param("clienteCodigo", clienteCodigo)
                .param("metodo", metodo)
                .param("total", total)
                .update();
    }

    public void insertarItemDevolucion(UUID tiendaId, String devolucionCodigo, int linea, VentaDto.Item item) {
        jdbc.sql("""
                insert into devolucion_item (tienda_id, devolucion_codigo, linea, producto_codigo, nombre, cantidad, valor_unitario)
                values (:tienda, :devolucion, :linea, :producto, :nombre, :cantidad, :valor)
                """)
                .param("tienda", tiendaId).param("devolucion", devolucionCodigo).param("linea", linea).param("producto", item.productoId())
                .param("nombre", item.nombre()).param("cantidad", item.cantidad()).param("valor", item.valorUnitario())
                .update();
    }

    /** Suma (o resta, si es negativo) al stock de un producto. */
    public void moverStock(UUID tiendaId, String productoCodigo, int cantidad) {
        jdbc.sql("update producto set existencias = existencias + :cantidad where tienda_id = :tienda and codigo = :codigo")
                .param("cantidad", cantidad).param("tienda", tiendaId).param("codigo", productoCodigo)
                .update();
    }
}
