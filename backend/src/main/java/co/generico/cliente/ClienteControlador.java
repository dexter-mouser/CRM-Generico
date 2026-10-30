package co.generico.cliente;

import co.generico.seguridad.UsuarioActual;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clientes")
public class ClienteControlador {

    private final ClienteServicio servicio;
    private final UsuarioActual actual;

    public ClienteControlador(ClienteServicio servicio, UsuarioActual actual) {
        this.servicio = servicio;
        this.actual = actual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('clientes', 'ver') or @permisos.puede('nueva-venta', 'crear') or @permisos.puede('pagos', 'ver')")
    public List<Cliente> buscar(@RequestParam(defaultValue = "") String consulta) {
        return servicio.buscar(actual.obtener(), consulta);
    }

    @GetMapping("/{codigo}/ventas")
    @PreAuthorize("@permisos.puede('clientes', 'ver')")
    public List<String> ventas(@PathVariable String codigo) {
        return servicio.ventasDe(actual.obtener(), codigo);
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('clientes', 'crear')")
    public Cliente crear(@RequestBody ClienteServicio.DatosCliente datos) {
        return servicio.crear(actual.obtener(), datos);
    }

    @PutMapping("/{codigo}")
    @PreAuthorize("@permisos.puede('clientes', 'editar')")
    public Cliente actualizar(@PathVariable String codigo, @RequestBody ClienteServicio.DatosCliente datos) {
        return servicio.actualizar(actual.obtener(), codigo, datos);
    }

    @DeleteMapping("/{codigo}")
    @PreAuthorize("@permisos.puede('clientes', 'eliminar')")
    public ResponseEntity<Void> eliminar(@PathVariable String codigo) {
        servicio.eliminar(actual.obtener(), codigo);
        return ResponseEntity.noContent().build();
    }
}
