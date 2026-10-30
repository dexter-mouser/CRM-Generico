package co.generico.auditoria;

import co.generico.seguridad.UsuarioActual;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaControlador {

    private final AuditoriaServicio servicio;
    private final UsuarioActual actual;

    public AuditoriaControlador(AuditoriaServicio servicio, UsuarioActual actual) {
        this.servicio = servicio;
        this.actual = actual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('auditoria', 'ver')")
    public List<AuditoriaServicio.Registro> consultar(
            @RequestParam(defaultValue = "") String modulo,
            @RequestParam(defaultValue = "") String texto,
            @RequestParam(defaultValue = "200") int limite) {
        return servicio.consultar(actual.obtener().tiendaId(), modulo, texto, limite);
    }
}
