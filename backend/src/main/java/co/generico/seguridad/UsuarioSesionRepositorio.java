package co.generico.seguridad;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UsuarioSesionRepositorio {

    private record Fila(UUID id, UUID tiendaId, String nombre, String correo, UUID rolId, String rolNombre, boolean protegido) {
    }

    private final JdbcClient jdbc;

    public UsuarioSesionRepositorio(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Solo personas activas: una persona desactivada pierde el acceso en su siguiente petición. */
    public Optional<UsuarioSesion> cargar(UUID usuarioId) {
        Optional<Fila> fila = jdbc.sql("""
                select u.id, u.tienda_id, u.nombre, u.correo, u.rol_id, r.nombre as rol_nombre, r.protegido
                from usuario u join rol r on r.id = u.rol_id
                where u.id = :id and u.activo
                """)
                .param("id", usuarioId)
                .query(Fila.class)
                .optional();
        return fila.map(datos -> new UsuarioSesion(datos.id(), datos.tiendaId(), datos.nombre(), datos.correo(),
                datos.rolId(), datos.rolNombre(), datos.protegido(), permisosDe(datos.rolId(), datos.protegido())));
    }

    private Set<String> permisosDe(UUID rolId, boolean protegido) {
        if (protegido) {
            return CatalogoPermisos.todos();
        }
        List<String> permisos = jdbc.sql("select modulo || ':' || accion from rol_permiso where rol_id = :rol")
                .param("rol", rolId)
                .query(String.class)
                .list();
        return new HashSet<>(permisos);
    }
}
