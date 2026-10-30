package co.generico.seguridad;

import org.springframework.stereotype.Component;

/** Se usa en las anotaciones: @PreAuthorize("@permisos.puede('ventas', 'eliminar')"). */
@Component("permisos")
public class Permisos {

    private final UsuarioActual actual;

    public Permisos(UsuarioActual actual) {
        this.actual = actual;
    }

    public boolean puede(String modulo, String accion) {
        return actual.opcional().map(usuario -> usuario.puede(modulo, accion)).orElse(false);
    }
}
