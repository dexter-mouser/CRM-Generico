package co.generico.seguridad;

import java.util.Set;
import java.util.UUID;

/** Persona autenticada en la petición actual. Se vuelve a leer de la base en cada petición, así que desactivarla o cambiarle el rol aplica de inmediato. */
public record UsuarioSesion(
        UUID usuarioId,
        UUID tiendaId,
        String nombre,
        String correo,
        UUID rolId,
        String rolNombre,
        boolean protegido,
        Set<String> permisos) {

    public boolean puede(String modulo, String accion) {
        return permisos.contains(modulo + ":" + accion);
    }
}
