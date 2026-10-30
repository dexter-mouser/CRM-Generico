package co.generico.venta;

import co.generico.seguridad.UsuarioActual;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class VentaControlador {

    public record SolicitudDevolucion(Map<String, Integer> cantidades, String motivo) {
    }

    public record SolicitudAnulacion(String motivo) {
    }

    private final VentaServicio servicio;
    private final UsuarioActual actual;

    public VentaControlador(VentaServicio servicio, UsuarioActual actual) {
        this.servicio = servicio;
        this.actual = actual;
    }

    @GetMapping("/ventas")
    @PreAuthorize("@permisos.puede('ventas', 'ver') or @permisos.puede('reportes', 'ver') or @permisos.puede('panel', 'ver')")
    public List<VentaDto.Venta> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return servicio.listar(actual.obtener(), desde, hasta);
    }

    @PostMapping("/ventas")
    @PreAuthorize("@permisos.puede('nueva-venta', 'crear')")
    public VentaDto.Venta registrar(@RequestBody VentaServicio.SolicitudVenta solicitud) {
        return servicio.registrar(actual.obtener(), solicitud);
    }

    @PostMapping("/ventas/{codigo}/devoluciones")
    @PreAuthorize("@permisos.puede('ventas', 'eliminar')")
    public VentaDto.Devolucion devolver(@PathVariable String codigo, @RequestBody SolicitudDevolucion solicitud) {
        return servicio.devolver(actual.obtener(), codigo, solicitud.cantidades(), solicitud.motivo());
    }

    @PostMapping("/ventas/{codigo}/anulacion")
    @PreAuthorize("@permisos.puede('ventas', 'eliminar')")
    public VentaDto.Devolucion anular(@PathVariable String codigo, @RequestBody SolicitudAnulacion solicitud) {
        return servicio.anular(actual.obtener(), codigo, solicitud.motivo());
    }

    @GetMapping("/devoluciones")
    @PreAuthorize("@permisos.puede('ventas', 'ver')")
    public List<VentaDto.Devolucion> listarDevoluciones() {
        return servicio.listarDevoluciones(actual.obtener());
    }
}
