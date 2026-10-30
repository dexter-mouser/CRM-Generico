package co.generico.cliente;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ClienteRepositorio {

    /** Consulta base: la deuda sale de las ventas a Fiado, las devoluciones a Fiado y los abonos del cliente. */
    private static final String SELECT_CLIENTE = """
            select c.codigo, c.nombre, c.telefono, c.correo, c.direccion,
              greatest(0,
                coalesce((select sum(v.total) from venta v where v.tienda_id = c.tienda_id and v.metodo = 'Fiado'
                          and lower(v.cliente) = lower(c.nombre)), 0)
                - coalesce((select sum(d.total) from devolucion d where d.tienda_id = c.tienda_id and d.metodo = 'Fiado'
                          and lower(d.cliente) = lower(c.nombre)), 0)
                - coalesce((select sum(p.valor) from pago p where p.tienda_id = c.tienda_id and p.tipo = 'abono'
                          and p.tercero_codigo = c.codigo), 0)
              )::bigint as deuda
            from cliente c
            """;

    private final JdbcClient jdbc;

    public ClienteRepositorio(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Cliente> buscar(UUID tiendaId, String consulta) {
        List<String> terminos = new ArrayList<>();
        for (String palabra : consulta.trim().split("\\s+")) {
            if (!palabra.isEmpty()) {
                terminos.add(palabra);
            }
        }
        StringBuilder sql = new StringBuilder(SELECT_CLIENTE).append(" where c.tienda_id = :tienda");
        for (int posicion = 0; posicion < terminos.size(); posicion++) {
            sql.append(" and unaccent(lower(concat_ws(' ', c.codigo, c.nombre, c.telefono, c.correo))) like unaccent(lower(:t")
                    .append(posicion).append("))");
        }
        sql.append(" order by c.codigo");
        JdbcClient.StatementSpec consultaSql = jdbc.sql(sql.toString()).param("tienda", tiendaId);
        for (int posicion = 0; posicion < terminos.size(); posicion++) {
            String texto = terminos.get(posicion).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            consultaSql = consultaSql.param("t" + posicion, "%" + texto + "%");
        }
        return consultaSql.query(Cliente.class).list();
    }

    public Optional<Cliente> buscarPorCodigo(UUID tiendaId, String codigo) {
        return jdbc.sql(SELECT_CLIENTE + " where c.tienda_id = :tienda and c.codigo = :codigo")
                .param("tienda", tiendaId).param("codigo", codigo)
                .query(Cliente.class).optional();
    }

    /** Búsqueda por nombre sin importar mayúsculas: las ventas guardan el nombre del cliente. */
    public Optional<Cliente> buscarPorNombre(UUID tiendaId, String nombre) {
        return jdbc.sql(SELECT_CLIENTE + " where c.tienda_id = :tienda and lower(c.nombre) = lower(:nombre)")
                .param("tienda", tiendaId).param("nombre", nombre.trim())
                .query(Cliente.class).optional();
    }

    public void insertar(UUID tiendaId, Cliente cliente) {
        jdbc.sql("""
                insert into cliente (tienda_id, codigo, nombre, telefono, correo, direccion)
                values (:tienda, :codigo, :nombre, :telefono, :correo, :direccion)
                """)
                .param("tienda", tiendaId).param("codigo", cliente.codigo()).param("nombre", cliente.nombre())
                .param("telefono", cliente.telefono()).param("correo", cliente.correo()).param("direccion", cliente.direccion())
                .update();
    }

    public void actualizar(UUID tiendaId, String codigo, Cliente cliente) {
        jdbc.sql("""
                update cliente set nombre = :nombre, telefono = :telefono, correo = :correo, direccion = :direccion
                where tienda_id = :tienda and codigo = :codigo
                """)
                .param("tienda", tiendaId).param("codigo", codigo).param("nombre", cliente.nombre())
                .param("telefono", cliente.telefono()).param("correo", cliente.correo()).param("direccion", cliente.direccion())
                .update();
    }

    /** Si cambia el nombre, las ventas y devoluciones anteriores se actualizan para no perder la deuda del cliente. */
    public void renombrarEnMovimientos(UUID tiendaId, String anterior, String nuevo) {
        jdbc.sql("update venta set cliente = :nuevo where tienda_id = :tienda and lower(cliente) = lower(:anterior)")
                .param("nuevo", nuevo).param("tienda", tiendaId).param("anterior", anterior).update();
        jdbc.sql("update devolucion set cliente = :nuevo where tienda_id = :tienda and lower(cliente) = lower(:anterior)")
                .param("nuevo", nuevo).param("tienda", tiendaId).param("anterior", anterior).update();
    }

    public void eliminar(UUID tiendaId, String codigo) {
        jdbc.sql("delete from cliente where tienda_id = :tienda and codigo = :codigo")
                .param("tienda", tiendaId).param("codigo", codigo).update();
    }

    public List<String> ventasDe(UUID tiendaId, String nombre) {
        return jdbc.sql("select codigo from venta where tienda_id = :tienda and lower(cliente) = lower(:nombre) order by fecha desc")
                .param("tienda", tiendaId).param("nombre", nombre)
                .query(String.class).list();
    }
}
