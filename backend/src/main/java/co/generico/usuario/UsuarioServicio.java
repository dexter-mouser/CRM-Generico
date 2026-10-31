package co.generico.usuario;

import co.generico.auditoria.AuditoriaServicio;
import co.generico.comun.NoEncontradoException;
import co.generico.comun.ReglaDeNegocioException;
import co.generico.comun.Validaciones;
import co.generico.seguridad.UsuarioSesion;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Personas de la tienda. Siempre debe quedar al menos un propietario activo. */
@Service
public class UsuarioServicio {

    public record UsuarioDto(UUID id, String nombre, String correo, UUID rolId, String rolNombre, boolean activo) {
    }

    static final int CLAVE_MINIMA = 10;

    private final JdbcClient jdbc;
    private final AuditoriaServicio auditoria;
    private final PasswordEncoder codificador;

    public UsuarioServicio(JdbcClient jdbc, AuditoriaServicio auditoria, PasswordEncoder codificador) {
        this.jdbc = jdbc;
        this.auditoria = auditoria;
        this.codificador = codificador;
    }

    public List<UsuarioDto> listar(UUID tiendaId) {
        return jdbc.sql("""
                select u.id, u.nombre, u.correo, u.rol_id, r.nombre as rol_nombre, u.activo
                from usuario u join rol r on r.id = u.rol_id
                where u.tienda_id = :tienda order by u.creado_en
                """)
                .param("tienda", tiendaId)
                .query(UsuarioDto.class)
                .list();
    }

    @Transactional
    public UsuarioDto agregar(UsuarioSesion quien, String nombre, String correo, UUID rolId, String clave) {
        String nombreLimpio = Validaciones.texto(nombre, "el nombre de la persona");
        String correoLimpio = Validaciones.correoDeTienda(correo);
        exigirRolDeLaTienda(quien.tiendaId(), rolId);
        String hash = null;
        if (clave != null && !clave.isBlank()) {
            if (clave.length() < CLAVE_MINIMA) {
                throw new ReglaDeNegocioException("La clave debe tener al menos " + CLAVE_MINIMA + " caracteres");
            }
            hash = codificador.encode(clave);
        }
        try {
            UUID id = jdbc.sql("""
                    insert into usuario (tienda_id, nombre, correo, clave_hash, rol_id) values (:tienda, :nombre, :correo, :hash, :rol)
                    returning id
                    """)
                    .param("tienda", quien.tiendaId()).param("nombre", nombreLimpio).param("correo", correoLimpio)
                    .param("hash", hash).param("rol", rolId)
                    .query(UUID.class).single();
            auditoria.registrar(quien, "roles", "Persona agregada", nombreLimpio + " · " + correoLimpio);
            return buscar(quien.tiendaId(), id);
        } catch (DuplicateKeyException repetido) {
            throw new ReglaDeNegocioException("Ese correo ya está registrado");
        }
    }

    @Transactional
    public UsuarioDto cambiarRol(UsuarioSesion quien, UUID usuarioId, UUID rolId) {
        UsuarioDto usuario = buscar(quien.tiendaId(), usuarioId);
        exigirRolDeLaTienda(quien.tiendaId(), rolId);
        boolean eraPropietario = esPropietario(usuario.rolId());
        boolean seguiraSiendo = esPropietario(rolId);
        if (eraPropietario && !seguiraSiendo && usuario.activo() && !quedaOtroPropietarioActivo(quien.tiendaId(), usuarioId)) {
            throw new ReglaDeNegocioException("Debe quedar al menos un propietario activo");
        }
        jdbc.sql("update usuario set rol_id = :rol where id = :id").param("rol", rolId).param("id", usuarioId).update();
        UsuarioDto actualizado = buscar(quien.tiendaId(), usuarioId);
        auditoria.registrar(quien, "roles", "Rol de una persona cambiado", usuario.nombre() + " → " + actualizado.rolNombre());
        return actualizado;
    }

    @Transactional
    public UsuarioDto cambiarEstado(UsuarioSesion quien, UUID usuarioId, boolean activo) {
        UsuarioDto usuario = buscar(quien.tiendaId(), usuarioId);
        if (!activo && esPropietario(usuario.rolId()) && !quedaOtroPropietarioActivo(quien.tiendaId(), usuarioId)) {
            throw new ReglaDeNegocioException("Debe quedar al menos un propietario activo");
        }
        jdbc.sql("update usuario set activo = :activo where id = :id").param("activo", activo).param("id", usuarioId).update();
        auditoria.registrar(quien, "roles", activo ? "Persona activada" : "Persona desactivada", usuario.nombre());
        return buscar(quien.tiendaId(), usuarioId);
    }

    private UsuarioDto buscar(UUID tiendaId, UUID id) {
        return jdbc.sql("""
                select u.id, u.nombre, u.correo, u.rol_id, r.nombre as rol_nombre, u.activo
                from usuario u join rol r on r.id = u.rol_id
                where u.id = :id and u.tienda_id = :tienda
                """)
                .param("id", id).param("tienda", tiendaId)
                .query(UsuarioDto.class).optional()
                .orElseThrow(() -> new NoEncontradoException("La persona no existe"));
    }

    private void exigirRolDeLaTienda(UUID tiendaId, UUID rolId) {
        boolean existe = jdbc.sql("select exists (select 1 from rol where id = :id and tienda_id = :tienda)")
                .param("id", rolId).param("tienda", tiendaId)
                .query(Boolean.class).single();
        if (!existe) {
            throw new ReglaDeNegocioException("Elige el rol de la persona");
        }
    }

    private boolean esPropietario(UUID rolId) {
        return jdbc.sql("select protegido from rol where id = :id").param("id", rolId).query(Boolean.class).optional().orElse(false);
    }

    private boolean quedaOtroPropietarioActivo(UUID tiendaId, UUID usuarioId) {
        return jdbc.sql("""
                select exists (select 1 from usuario u join rol r on r.id = u.rol_id
                               where u.tienda_id = :tienda and u.activo and r.protegido and u.id <> :id)
                """)
                .param("tienda", tiendaId).param("id", usuarioId)
                .query(Boolean.class).single();
    }
}
