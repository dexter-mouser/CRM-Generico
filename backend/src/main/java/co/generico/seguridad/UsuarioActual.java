package co.generico.seguridad;

import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Acceso a la persona de la petición actual. */
@Component
public class UsuarioActual {

    public Optional<UsuarioSesion> opcional() {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacion != null && autenticacion.getPrincipal() instanceof UsuarioSesion usuario) {
            return Optional.of(usuario);
        }
        return Optional.empty();
    }

    public UsuarioSesion obtener() {
        return opcional().orElseThrow(() -> new IllegalStateException("No hay una sesión activa"));
    }
}
