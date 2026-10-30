package co.generico.rol;

import co.generico.auditoria.AuditoriaServicio;
import co.generico.comun.NoEncontradoException;
import co.generico.comun.ReglaDeNegocioException;
import co.generico.comun.Validaciones;
import co.generico.seguridad.CatalogoPermisos;
import co.generico.seguridad.UsuarioSesion;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Roles y permisos de cada tienda. El rol protegido (Propietario) tiene acceso total y no se modifica. */
@Service
public class RolServicio {

    public record RolDto(UUID id, String clave, String nombre, String descripcion, boolean protegido,
            Map<String, List<String>> permisos, int miembros) {
    }

    private record RolFila(UUID id, String clave, String nombre, String descripcion, boolean protegido, int miembros) {
    }

    private record PermisoFila(UUID rolId, String modulo, String accion) {
    }

    private final JdbcClient jdbc;
    private final AuditoriaServicio auditoria;

    public RolServicio(JdbcClient jdbc, AuditoriaServicio auditoria) {
        this.jdbc = jdbc;
        this.auditoria = auditoria;
    }

    public List<RolDto> listar(UUID tiendaId) {
        List<RolFila> roles = jdbc.sql("""
                select r.id, r.clave, r.nombre, r.descripcion, r.protegido,
                       (select count(*) from usuario u where u.rol_id = r.id)::int as miembros
                from rol r where r.tienda_id = :tienda order by r.protegido desc, r.nombre
                """)
                .param("tienda", tiendaId)
                .query(RolFila.class)
                .list();
        List<PermisoFila> permisos = jdbc.sql("""
                select p.rol_id, p.modulo, p.accion from rol_permiso p join rol r on r.id = p.rol_id
                where r.tienda_id = :tienda
                """)
                .param("tienda", tiendaId)
                .query(PermisoFila.class)
                .list();
        return roles.stream().map(rol -> {
            Map<String, List<String>> porModulo = new LinkedHashMap<>();
            if (rol.protegido()) {
                CatalogoPermisos.ACCIONES_POR_MODULO.forEach((modulo, acciones) -> porModulo.put(modulo, acciones));
            } else {
                CatalogoPermisos.ACCIONES_POR_MODULO.forEach((modulo, acciones) -> {
                    List<String> marcadas = acciones.stream().filter(accion -> permisos.stream().anyMatch(permiso ->
                            permiso.rolId().equals(rol.id()) && permiso.modulo().equals(modulo) && permiso.accion().equals(accion))).toList();
                    if (!marcadas.isEmpty()) {
                        porModulo.put(modulo, marcadas);
                    }
                });
            }
            return new RolDto(rol.id(), rol.clave(), rol.nombre(), rol.descripcion(), rol.protegido(), porModulo, rol.miembros());
        }).toList();
    }

    @Transactional
    public RolDto crear(UsuarioSesion quien, String nombre, String descripcion) {
        String nombreLimpio = Validaciones.texto(nombre, "el nombre del rol", true, 60, 0);
        String descripcionLimpia = Validaciones.textoOpcional(descripcion, "la descripción", Validaciones.TEXTO_LARGO);
        exigirNombreLibre(quien.tiendaId(), nombreLimpio, null);
        String base = Normalizer.normalize(nombreLimpio, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase()
                .replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String clave = base.isEmpty() ? "rol" : base;
        for (int numero = 2; existeClave(quien.tiendaId(), clave); numero++) {
            clave = (base.isEmpty() ? "rol" : base) + "-" + numero;
        }
        UUID id = jdbc.sql("""
                insert into rol (tienda_id, clave, nombre, descripcion) values (:tienda, :clave, :nombre, :descripcion)
                returning id
                """)
                .param("tienda", quien.tiendaId()).param("clave", clave).param("nombre", nombreLimpio).param("descripcion", descripcionLimpia)
                .query(UUID.class).single();
        jdbc.sql("insert into rol_permiso (rol_id, modulo, accion) values (:rol, 'panel', 'ver')").param("rol", id).update();
        auditoria.registrar(quien, "roles", "Rol creado", nombreLimpio);
        return buscarDto(quien.tiendaId(), id);
    }

    @Transactional
    public RolDto actualizar(UsuarioSesion quien, UUID id, String nombre, String descripcion) {
        RolFila rol = editable(quien.tiendaId(), id);
        String nombreLimpio = Validaciones.texto(nombre, "el nombre del rol", true, 60, 0);
        exigirNombreLibre(quien.tiendaId(), nombreLimpio, id);
        jdbc.sql("update rol set nombre = :nombre, descripcion = :descripcion where id = :id")
                .param("nombre", nombreLimpio)
                .param("descripcion", Validaciones.textoOpcional(descripcion, "la descripción", Validaciones.TEXTO_LARGO))
                .param("id", rol.id()).update();
        auditoria.registrar(quien, "roles", "Rol editado", nombreLimpio);
        return buscarDto(quien.tiendaId(), id);
    }

    /** Reemplaza todos los permisos del rol por los enviados, ya normalizados. */
    @Transactional
    public RolDto establecerPermisos(UsuarioSesion quien, UUID id, Map<String, List<String>> pedidos) {
        RolFila rol = editable(quien.tiendaId(), id);
        Map<String, List<String>> limpios = CatalogoPermisos.normalizar(pedidos);
        jdbc.sql("delete from rol_permiso where rol_id = :rol").param("rol", id).update();
        List<String[]> filas = new ArrayList<>();
        limpios.forEach((modulo, acciones) -> acciones.forEach(accion -> filas.add(new String[] {modulo, accion})));
        for (String[] fila : filas) {
            jdbc.sql("insert into rol_permiso (rol_id, modulo, accion) values (:rol, :modulo, :accion)")
                    .param("rol", id).param("modulo", fila[0]).param("accion", fila[1]).update();
        }
        auditoria.registrar(quien, "roles", "Permisos cambiados", rol.nombre() + " · " + filas.size() + " permiso(s)");
        return buscarDto(quien.tiendaId(), id);
    }

    @Transactional
    public void eliminar(UsuarioSesion quien, UUID id) {
        RolFila rol = editable(quien.tiendaId(), id);
        int miembros = rol.miembros();
        if (miembros > 0) {
            throw new ReglaDeNegocioException("Hay " + miembros + " persona(s) con este rol: cámbialas de rol antes de eliminarlo");
        }
        jdbc.sql("delete from rol where id = :id").param("id", id).update();
        auditoria.registrar(quien, "roles", "Rol eliminado", rol.nombre());
    }

    private RolDto buscarDto(UUID tiendaId, UUID id) {
        return listar(tiendaId).stream().filter(rol -> rol.id().equals(id)).findFirst()
                .orElseThrow(() -> new NoEncontradoException("El rol no existe"));
    }

    private RolFila editable(UUID tiendaId, UUID id) {
        RolFila rol = jdbc.sql("""
                select r.id, r.clave, r.nombre, r.descripcion, r.protegido,
                       (select count(*) from usuario u where u.rol_id = r.id)::int as miembros
                from rol r where r.id = :id and r.tienda_id = :tienda
                """)
                .param("id", id).param("tienda", tiendaId)
                .query(RolFila.class).optional()
                .orElseThrow(() -> new NoEncontradoException("El rol no existe"));
        if (rol.protegido()) {
            throw new ReglaDeNegocioException("El rol " + rol.nombre() + " tiene acceso total y no se puede modificar");
        }
        return rol;
    }

    private void exigirNombreLibre(UUID tiendaId, String nombre, UUID idActual) {
        boolean repetido = jdbc.sql("""
                select exists (select 1 from rol where tienda_id = :tienda and lower(nombre) = lower(:nombre)
                               and (cast(:id as uuid) is null or id <> cast(:id as uuid)))
                """)
                .param("tienda", tiendaId).param("nombre", nombre).param("id", idActual)
                .query(Boolean.class).single();
        if (repetido) {
            throw new ReglaDeNegocioException("Ya existe un rol llamado " + nombre);
        }
    }

    private boolean existeClave(UUID tiendaId, String clave) {
        return jdbc.sql("select exists (select 1 from rol where tienda_id = :tienda and clave = :clave)")
                .param("tienda", tiendaId).param("clave", clave)
                .query(Boolean.class).single();
    }
}
