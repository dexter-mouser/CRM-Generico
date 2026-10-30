package co.generico.auditoria;

import co.generico.seguridad.UsuarioSesion;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Auditoría: solo agrega y consulta. La base de datos rechaza cambios y borrados (ver V1). */
@Service
public class AuditoriaServicio {

    public record Registro(long id, OffsetDateTime fecha, String usuario, String modulo, String accion, String detalle) {
    }

    private final JdbcClient jdbc;

    public AuditoriaServicio(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void registrar(UsuarioSesion usuario, String modulo, String accion, String detalle) {
        registrar(usuario.tiendaId(), usuario.nombre(), modulo, accion, detalle);
    }

    /** El usuario sale siempre de la sesión, nunca de lo que envía el cliente. */
    public void registrar(UUID tiendaId, String usuario, String modulo, String accion, String detalle) {
        String texto = detalle == null ? "" : detalle;
        jdbc.sql("""
                insert into auditoria (tienda_id, usuario, modulo, accion, detalle)
                values (:tienda, :usuario, :modulo, :accion, :detalle)
                """)
                .param("tienda", tiendaId)
                .param("usuario", usuario)
                .param("modulo", modulo)
                .param("accion", accion)
                .param("detalle", texto.length() > 400 ? texto.substring(0, 400) : texto)
                .update();
    }

    public List<Registro> consultar(UUID tiendaId, String modulo, String texto, int limite) {
        return jdbc.sql("""
                select id, fecha, usuario, modulo, accion, detalle from auditoria
                where tienda_id = :tienda
                  and (:modulo = '' or modulo = :modulo)
                  and (:texto = '' or unaccent(lower(usuario || ' ' || accion || ' ' || detalle)) like unaccent(lower('%' || :texto || '%')))
                order by id desc
                limit :limite
                """)
                .param("tienda", tiendaId)
                .param("modulo", modulo == null ? "" : modulo)
                .param("texto", texto == null ? "" : texto.trim())
                .param("limite", Math.min(Math.max(limite, 1), 500))
                .query(Registro.class)
                .list();
    }
}
