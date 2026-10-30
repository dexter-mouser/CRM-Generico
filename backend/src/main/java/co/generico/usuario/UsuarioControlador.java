package co.generico.usuario;

import co.generico.seguridad.UsuarioActual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioControlador {

    public record SolicitudUsuario(@NotBlank @Size(max = 120) String nombre, @NotBlank @Size(max = 120) String correo,
            @NotNull UUID rolId, @Size(max = 200) String clave) {
    }

    public record SolicitudRol(@NotNull UUID rolId) {
    }

    public record SolicitudEstado(boolean activo) {
    }

    private final UsuarioServicio servicio;
    private final UsuarioActual actual;

    public UsuarioControlador(UsuarioServicio servicio, UsuarioActual actual) {
        this.servicio = servicio;
        this.actual = actual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('roles', 'ver')")
    public List<UsuarioServicio.UsuarioDto> listar() {
        return servicio.listar(actual.obtener().tiendaId());
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('roles', 'crear')")
    public UsuarioServicio.UsuarioDto agregar(@Valid @RequestBody SolicitudUsuario solicitud) {
        return servicio.agregar(actual.obtener(), solicitud.nombre(), solicitud.correo(), solicitud.rolId(), solicitud.clave());
    }

    @PutMapping("/{id}/rol")
    @PreAuthorize("@permisos.puede('roles', 'editar')")
    public UsuarioServicio.UsuarioDto cambiarRol(@PathVariable UUID id, @Valid @RequestBody SolicitudRol solicitud) {
        return servicio.cambiarRol(actual.obtener(), id, solicitud.rolId());
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("@permisos.puede('roles', 'editar')")
    public UsuarioServicio.UsuarioDto cambiarEstado(@PathVariable UUID id, @RequestBody SolicitudEstado solicitud) {
        return servicio.cambiarEstado(actual.obtener(), id, solicitud.activo());
    }
}
