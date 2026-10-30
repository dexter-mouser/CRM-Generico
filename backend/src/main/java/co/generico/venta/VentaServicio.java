package co.generico.venta;

import co.generico.auditoria.AuditoriaServicio;
import co.generico.cliente.Cliente;
import co.generico.cliente.ClienteRepositorio;
import co.generico.comun.Consecutivos;
import co.generico.comun.NoEncontradoException;
import co.generico.comun.ReglaDeNegocioException;
import co.generico.comun.Validaciones;
import co.generico.seguridad.UsuarioSesion;
import co.generico.tienda.TiendaRepositorio;
import co.generico.tienda.TiendaRepositorio.Tienda;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de ventas. El total, los nombres y el vendedor los calcula el servidor: nunca se confía en lo que envía el cliente.
 * Devoluciones y anulaciones devuelven el stock, y el dinero (en efectivo, de la caja abierta) o la deuda si fue a Fiado.
 */
@Service
public class VentaServicio {

    public record LineaVenta(String productoId, Integer cantidad, Long valorUnitario) {
    }

    public record SolicitudVenta(String cliente, String metodo, Long recibido, String observaciones, List<LineaVenta> items) {
    }

    static final int MAXIMO_LINEAS = 200;

    private final VentaRepositorio repositorio;
    private final TiendaRepositorio tiendas;
    private final ClienteRepositorio clientes;
    private final Consecutivos consecutivos;
    private final AuditoriaServicio auditoria;

    public VentaServicio(VentaRepositorio repositorio, TiendaRepositorio tiendas, ClienteRepositorio clientes,
            Consecutivos consecutivos, AuditoriaServicio auditoria) {
        this.repositorio = repositorio;
        this.tiendas = tiendas;
        this.clientes = clientes;
        this.consecutivos = consecutivos;
        this.auditoria = auditoria;
    }

    // --- Consultas ---------------------------------------------------------------------------------------

    public List<VentaDto.Venta> listar(UsuarioSesion quien, LocalDate desde, LocalDate hasta) {
        return repositorio.listar(quien.tiendaId(), desde, hasta, tiendas.obtener(quien.tiendaId()).zona());
    }

    public List<VentaDto.Devolucion> listarDevoluciones(UsuarioSesion quien) {
        return repositorio.listarDevoluciones(quien.tiendaId());
    }

    // --- Registrar venta ---------------------------------------------------------------------------------

    @Transactional
    public VentaDto.Venta registrar(UsuarioSesion quien, SolicitudVenta solicitud) {
        Tienda tienda = tiendas.obtener(quien.tiendaId());
        List<LineaVenta> lineas = solicitud.items() == null ? List.of() : solicitud.items();
        if (lineas.isEmpty()) {
            throw new ReglaDeNegocioException("Agrega al menos un producto a la venta");
        }
        if (lineas.size() > MAXIMO_LINEAS) {
            throw new ReglaDeNegocioException("Una venta admite hasta " + MAXIMO_LINEAS + " productos");
        }
        String metodo = Validaciones.limpiar(solicitud.metodo());
        if (!tienda.metodosPago().contains(metodo)) {
            throw new ReglaDeNegocioException("Elige un método de pago disponible");
        }
        String cliente = Validaciones.textoOpcional(solicitud.cliente(), "el cliente", Validaciones.TEXTO);

        // Cantidades y valores válidos, sin productos repetidos
        Set<String> vistos = new HashSet<>();
        for (LineaVenta linea : lineas) {
            String codigo = Validaciones.limpiar(linea.productoId());
            if (codigo.isEmpty() || !vistos.add(codigo)) {
                throw new ReglaDeNegocioException("Cada producto debe aparecer una sola vez en la venta");
            }
            Validaciones.entero(linea.cantidad() == null ? null : linea.cantidad().longValue(), "la cantidad", 1, Validaciones.VALOR_MAXIMO);
            Validaciones.entero(linea.valorUnitario(), "el valor unitario", 1, Validaciones.VALOR_MAXIMO);
        }

        // Productos reales, bloqueados mientras dura la venta para que dos ventas no vendan el mismo stock
        Map<String, VentaRepositorio.ProductoBloqueado> productos = new LinkedHashMap<>();
        repositorio.bloquearProductos(quien.tiendaId(), new ArrayList<>(vistos)).forEach(producto -> productos.put(producto.codigo(), producto));
        List<VentaDto.Item> items = new ArrayList<>();
        long total = 0;
        for (LineaVenta linea : lineas) {
            String codigo = Validaciones.limpiar(linea.productoId());
            VentaRepositorio.ProductoBloqueado producto = productos.get(codigo);
            if (producto == null) {
                throw new ReglaDeNegocioException("El producto " + codigo + " no existe");
            }
            if (!tienda.permitirSinExistencias() && linea.cantidad() > producto.existencias()) {
                throw new ReglaDeNegocioException("No hay existencias suficientes de " + producto.nombre() + " (disponibles: " + producto.existencias() + ")");
            }
            items.add(new VentaDto.Item(codigo, producto.nombre(), linea.cantidad(), linea.valorUnitario()));
            total = Math.addExact(total, Math.multiplyExact(linea.cantidad().longValue(), linea.valorUnitario()));
        }
        Validaciones.entero(total, "el total de la venta", 0, Validaciones.VALOR_MAXIMO * 10);

        if ("Fiado".equals(metodo) && clientes.buscarPorNombre(quien.tiendaId(), cliente).isEmpty()) {
            throw new ReglaDeNegocioException("Para vender a Fiado, registra primero al cliente en Clientes y escribe su nombre completo");
        }

        // En efectivo se puede indicar con cuánto paga el cliente; la devuelta es la diferencia. En los demás métodos se paga lo exacto
        long recibido = total;
        if ("Efectivo".equals(metodo) && solicitud.recibido() != null && solicitud.recibido() > 0) {
            recibido = Validaciones.entero(solicitud.recibido(), "el monto recibido", 0, Validaciones.VALOR_MAXIMO * 10);
            if (recibido < total) {
                throw new ReglaDeNegocioException("El monto recibido no cubre el total de la venta");
            }
        }
        String observaciones = Validaciones.textoOpcional(solicitud.observaciones(), "las observaciones", Validaciones.TEXTO_LARGO);

        String codigoVenta = consecutivos.siguiente(quien.tiendaId(), "V", 4);
        repositorio.insertarVenta(quien.tiendaId(), codigoVenta, cliente.isEmpty() ? "Cliente sin nombre" : cliente, metodo, quien.nombre(), total,
                recibido, recibido - total, observaciones);
        int linea = 1;
        for (VentaDto.Item item : items) {
            repositorio.insertarItemVenta(quien.tiendaId(), codigoVenta, linea++, item);
            repositorio.moverStock(quien.tiendaId(), item.productoId(), -item.cantidad());
        }
        auditoria.registrar(quien, "ventas", "Factura de venta registrada", codigoVenta + " · " + (cliente.isEmpty() ? "Cliente sin nombre" : cliente) + " · " + metodo + " · $ " + total);
        return obtener(quien.tiendaId(), codigoVenta);
    }

    // --- Devoluciones y anulaciones ----------------------------------------------------------------------

    @Transactional
    public VentaDto.Devolucion devolver(UsuarioSesion quien, String ventaCodigo, Map<String, Integer> cantidades, String motivo) {
        return crearDevolucion(quien, ventaCodigo, "devolucion", cantidades == null ? Map.of() : cantidades, motivo);
    }

    /** Solo se anulan ventas de días con la contabilidad abierta; las demás admiten devolución. */
    @Transactional
    public VentaDto.Devolucion anular(UsuarioSesion quien, String ventaCodigo, String motivo) {
        VentaDto.Venta venta = obtener(quien.tiendaId(), ventaCodigo);
        LocalDate ultimoCerrado = repositorio.ultimoDiaCerrado(quien.tiendaId());
        LocalDate diaDeVenta = venta.fecha().atZoneSameInstant(tiendas.obtener(quien.tiendaId()).zona()).toLocalDate();
        if (ultimoCerrado != null && !diaDeVenta.isAfter(ultimoCerrado)) {
            throw new ReglaDeNegocioException("La contabilidad de ese día ya está cerrada: registra una devolución en lugar de anular");
        }
        repositorio.bloquear(quien.tiendaId(), ventaCodigo);
        Map<String, Integer> todo = new LinkedHashMap<>();
        pendientes(quien.tiendaId(), venta).forEach((producto, cantidad) -> todo.put(producto, cantidad));
        return crearDevolucion(quien, ventaCodigo, "anulacion", todo, motivo);
    }

    private VentaDto.Devolucion crearDevolucion(UsuarioSesion quien, String ventaCodigo, String tipo, Map<String, Integer> cantidades, String motivo) {
        String motivoLimpio = Validaciones.motivo(motivo);
        repositorio.bloquear(quien.tiendaId(), ventaCodigo);
        VentaDto.Venta venta = obtener(quien.tiendaId(), ventaCodigo);
        if (venta.anulada()) {
            throw new ReglaDeNegocioException("La venta " + ventaCodigo + " ya está anulada");
        }
        Map<String, Integer> pendientes = pendientes(quien.tiendaId(), venta);
        if (pendientes.isEmpty()) {
            throw new ReglaDeNegocioException("La venta " + ventaCodigo + " ya fue devuelta por completo");
        }

        List<VentaDto.Item> items = new ArrayList<>();
        long total = 0;
        for (VentaDto.Item original : venta.items()) {
            int disponibles = pendientes.getOrDefault(original.productoId(), 0);
            Integer pedida = cantidades.get(original.productoId());
            if (pedida == null || pedida == 0) {
                continue;
            }
            if (pedida < 0 || pedida > disponibles) {
                throw new ReglaDeNegocioException("De " + original.nombre() + " solo se pueden devolver " + disponibles + " unidad(es)");
            }
            items.add(new VentaDto.Item(original.productoId(), original.nombre(), pedida, original.valorUnitario()));
            total += pedida * original.valorUnitario();
        }
        if (items.isEmpty()) {
            throw new ReglaDeNegocioException("Escribe la cantidad que se devuelve de al menos un producto");
        }

        // De dónde sale el dinero: Fiado baja la deuda; efectivo sale de la caja abierta; los demás métodos se reintegran por el mismo medio
        if ("Fiado".equals(venta.metodo())) {
            Optional<Cliente> cliente = clientes.buscarPorNombre(quien.tiendaId(), venta.cliente());
            if (cliente.isPresent() && total > cliente.get().deuda()) {
                throw new ReglaDeNegocioException(cliente.get().nombre()
                        + " ya abonó parte de esta venta: la devolución supera su deuda actual. Registra el reembolso como egreso en Caja");
            }
        } else if ("Efectivo".equals(venta.metodo()) && !repositorio.hayCajaAbierta(quien.tiendaId())) {
            throw new ReglaDeNegocioException("Abre la caja para devolver dinero en efectivo");
        }

        // Nota de devolución (ND) o de anulación (NA), anclada a la factura original
        String codigo = consecutivos.siguiente(quien.tiendaId(), "anulacion".equals(tipo) ? "NA" : "ND", 4);
        repositorio.insertarDevolucion(quien.tiendaId(), codigo, ventaCodigo, tipo, motivoLimpio, quien.nombre(), venta.cliente(), venta.metodo(), total);
        int linea = 1;
        for (VentaDto.Item item : items) {
            repositorio.insertarItemDevolucion(quien.tiendaId(), codigo, linea++, item);
            repositorio.moverStock(quien.tiendaId(), item.productoId(), item.cantidad());
        }
        auditoria.registrar(quien, "ventas", "anulacion".equals(tipo) ? "Venta anulada" : "Devolución registrada",
                codigo + " sobre " + ventaCodigo + " · $ " + total + " · " + motivoLimpio);
        return repositorio.buscarDevolucion(quien.tiendaId(), codigo).orElseThrow();
    }

    /** Unidades que aún se pueden devolver de cada producto de la venta. */
    private Map<String, Integer> pendientes(UUID tiendaId, VentaDto.Venta venta) {
        Map<String, Long> devuelto = new LinkedHashMap<>();
        repositorio.devuelto(tiendaId, venta.codigo()).forEach(fila -> devuelto.put(fila.productoCodigo(), fila.cantidad()));
        Map<String, Integer> pendientes = new LinkedHashMap<>();
        for (VentaDto.Item item : venta.items()) {
            int disponibles = item.cantidad() - devuelto.getOrDefault(item.productoId(), 0L).intValue();
            if (disponibles > 0) {
                pendientes.put(item.productoId(), disponibles);
            }
        }
        return pendientes;
    }

    private VentaDto.Venta obtener(UUID tiendaId, String codigo) {
        return repositorio.buscar(tiendaId, codigo).orElseThrow(() -> new NoEncontradoException("La venta no existe"));
    }
}
