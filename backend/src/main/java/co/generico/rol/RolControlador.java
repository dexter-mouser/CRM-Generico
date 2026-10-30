package co.generico.rol;

import co.generico.seguridad.UsuarioActual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roles")
public class RolControlador {

    public record SolicitudRol(@NotBlank @Size(max = 60) String nombre, @Size(max = 300) String descripcion) {
    }

    public record SolicitudPermisos(@NotNull Map<String, List<String>> permisos) {
    }

    private final RolServicio servicio;
    private final UsuarioActual actual;

    public RolControlador(RolServicio servicio, UsuarioActual actual) {
        this.servicio = servicio;
        this.actual = actual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('roles', 'ver')")
    public List<RolServicio.RolDto> listar() {
        return servicio.listar(actual.obtener().tiendaId());
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('roles', 'crear')")
    public RolServicio.RolDto crear(@Valid @RequestBody SolicitudRol solicitud) {
        return servicio.crear(actual.obtener(), solicitud.nombre(), solicitud.descripcion());
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisos.puede('roles', 'editar')")
    public RolServicio.RolDto actualizar(@PathVariable UUID id, @Valid @RequestBody SolicitudRol solicitud) {
        return servicio.actualizar(actual.obtener(), id, solicitud.nombre(), solicitud.descripcion());
    }

    @PutMapping("/{id}/permisos")
    @PreAuthorize("@permisos.puede('roles', 'editar')")
    public RolServicio.RolDto establecerPermisos(@PathVariable UUID id, @Valid @RequestBody SolicitudPermisos solicitud) {
        return servicio.establecerPermisos(actual.obtener(), id, solicitud.permisos());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisos.puede('roles', 'eliminar')")
    public ResponseEntity<Void> eliminar(@PathVariable UUID id) {
        servicio.eliminar(actual.obtener(), id);
        return ResponseEntity.noContent().build();
    }
}
