package co.generico.inicial;

import co.generico.configuracion.PropiedadesGenerico;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Datos de demostración (la tienda "Mundo Mascota" del frontend). Solo se crean si generico.demo.sembrar=true
 * (perfil dev) y la base está vacía. En producción queda desactivado.
 */
@Component
public class InicializadorDemo implements ApplicationRunner {

    private static final Logger registro = LoggerFactory.getLogger(InicializadorDemo.class);

    private final PropiedadesGenerico propiedades;
    private final JdbcClient jdbc;
    private final PasswordEncoder codificador;
    private final ObjectMapper json;

    public InicializadorDemo(PropiedadesGenerico propiedades, JdbcClient jdbc, PasswordEncoder codificador, ObjectMapper json) {
        this.propiedades = propiedades;
        this.jdbc = jdbc;
        this.codificador = codificador;
        this.json = json;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments argumentos) throws Exception {
        if (!propiedades.demo().sembrar()) {
            return;
        }
        if (propiedades.demo().clave() == null || propiedades.demo().clave().isBlank()) {
            throw new IllegalStateException("generico.demo.clave es obligatoria para sembrar datos de demostración");
        }
        boolean hayTiendas = jdbc.sql("select exists (select 1 from tienda)").query(Boolean.class).single();
        if (hayTiendas) {
            return;
        }

        JsonNode datos;
        try (InputStream entrada = getClass().getResourceAsStream("/demo/datos.json")) {
            datos = json.readTree(entrada);
        }

        JsonNode tienda = datos.get("tienda");
        UUID tiendaId = jdbc.sql("""
                insert into tienda (nombre, nit, telefono, ciudad, direccion, pie_recibo)
                values (:nombre, :nit, :telefono, :ciudad, :direccion, '¡Gracias por tu compra!') returning id
                """)
                .param("nombre", tienda.get("nombre").asText()).param("nit", tienda.get("nit").asText())
                .param("telefono", tienda.get("telefono").asText()).param("ciudad", tienda.get("ciudad").asText())
                .param("direccion", tienda.get("direccion").asText())
                .query(UUID.class).single();

        Map<String, UUID> roles = new HashMap<>();
        roles.put("propietario", jdbc.sql("""
                insert into rol (tienda_id, clave, nombre, descripcion, protegido)
                values (:tienda, 'propietario', 'Propietario', 'Acceso total. No se puede modificar.', true) returning id
                """).param("tienda", tiendaId).query(UUID.class).single());
        for (JsonNode rol : datos.get("roles")) {
            UUID rolId = jdbc.sql("""
                    insert into rol (tienda_id, clave, nombre, descripcion) values (:tienda, :clave, :nombre, :descripcion) returning id
                    """)
                    .param("tienda", tiendaId).param("clave", rol.get("clave").asText()).param("nombre", rol.get("nombre").asText())
                    .param("descripcion", rol.get("descripcion").asText())
                    .query(UUID.class).single();
            roles.put(rol.get("clave").asText(), rolId);
            rol.get("permisos").fields().forEachRemaining(modulo -> modulo.getValue().forEach(accion ->
                    jdbc.sql("insert into rol_permiso (rol_id, modulo, accion) values (:rol, :modulo, :accion)")
                            .param("rol", rolId).param("modulo", modulo.getKey()).param("accion", accion.asText()).update()));
        }

        String hash = codificador.encode(propiedades.demo().clave());
        for (JsonNode usuario : datos.get("usuarios")) {
            jdbc.sql("insert into usuario (tienda_id, nombre, correo, clave_hash, rol_id) values (:tienda, :nombre, :correo, :hash, :rol)")
                    .param("tienda", tiendaId).param("nombre", usuario.get("nombre").asText())
                    .param("correo", usuario.get("correo").asText()).param("hash", hash)
                    .param("rol", roles.get(usuario.get("rol").asText())).update();
        }
        for (JsonNode producto : datos.get("productos")) {
            jdbc.sql("""
                    insert into producto (tienda_id, codigo, referencia, nombre, costo, existencias)
                    values (:tienda, :codigo, :referencia, :nombre, :costo, :existencias)
                    """)
                    .param("tienda", tiendaId).param("codigo", producto.get("codigo").asText()).param("referencia", producto.get("referencia").asText())
                    .param("nombre", producto.get("nombre").asText()).param("costo", producto.get("costo").asLong())
                    .param("existencias", producto.get("existencias").asInt()).update();
        }
        for (JsonNode cliente : datos.get("clientes")) {
            jdbc.sql("""
                    insert into cliente (tienda_id, codigo, nombre, telefono, correo, direccion)
                    values (:tienda, :codigo, :nombre, :telefono, :correo, :direccion)
                    """)
                    .param("tienda", tiendaId).param("codigo", cliente.get("codigo").asText()).param("nombre", cliente.get("nombre").asText())
                    .param("telefono", cliente.get("telefono").asText()).param("correo", cliente.get("correo").asText())
                    .param("direccion", cliente.get("direccion").asText()).update();
        }
        // El consecutivo de clientes arranca después de los sembrados (C-008). Los productos usan el mayor código más uno.
        jdbc.sql("insert into consecutivo (tienda_id, clave, ultimo) values (:tienda, 'C', :clientes)")
                .param("tienda", tiendaId).param("clientes", datos.get("clientes").size()).update();
        registro.warn("Datos de demostración creados (tienda {}). No usar en producción.", tienda.get("nombre").asText());
    }
}
