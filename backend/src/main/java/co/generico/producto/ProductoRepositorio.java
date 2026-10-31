package co.generico.producto;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ProductoRepositorio {

    private final JdbcClient jdbc;

    public ProductoRepositorio(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Cada palabra escrita debe aparecer en el ID, nombre, referencia, costo o stock (sin importar tildes ni mayúsculas). */
    public List<Producto> buscar(UUID tiendaId, String consulta) {
        List<String> terminos = new ArrayList<>();
        for (String palabra : consulta.trim().split("\\s+")) {
            if (!palabra.isEmpty()) {
                terminos.add(palabra);
            }
        }
        StringBuilder sql = new StringBuilder("""
                select codigo, referencia, nombre, costo, existencias from producto where tienda_id = :tienda
                """);
        for (int posicion = 0; posicion < terminos.size(); posicion++) {
            sql.append(" and unaccent(lower(concat_ws(' ', codigo, nombre, referencia, costo::text, existencias::text))) like unaccent(lower(:t")
                    .append(posicion).append("))");
        }
        // Los códigos son números guardados como texto: se ordenan por largo y luego por valor (2 antes que 10)
        sql.append(" order by length(codigo), codigo");
        JdbcClient.StatementSpec consultaSql = jdbc.sql(sql.toString()).param("tienda", tiendaId);
        for (int posicion = 0; posicion < terminos.size(); posicion++) {
            consultaSql = consultaSql.param("t" + posicion, "%" + escaparLike(terminos.get(posicion)) + "%");
        }
        return consultaSql.query(Producto.class).list();
    }

    /** Siguiente código de producto: el mayor código numérico de la tienda más uno. */
    public String siguienteCodigo(UUID tiendaId) {
        return jdbc.sql("""
                select (coalesce(max(codigo::bigint), 0) + 1)::text from producto
                where tienda_id = :tienda and codigo ~ '^[0-9]{1,12}$'
                """)
                .param("tienda", tiendaId)
                .query(String.class).single();
    }

    public Optional<Producto> buscarPorCodigo(UUID tiendaId, String codigo) {
        return jdbc.sql("select codigo, referencia, nombre, costo, existencias from producto where tienda_id = :tienda and codigo = :codigo")
                .param("tienda", tiendaId).param("codigo", codigo)
                .query(Producto.class).optional();
    }

    public void insertar(UUID tiendaId, Producto producto) {
        jdbc.sql("""
                insert into producto (tienda_id, codigo, referencia, nombre, costo, existencias)
                values (:tienda, :codigo, :referencia, :nombre, :costo, :existencias)
                """)
                .param("tienda", tiendaId).param("codigo", producto.codigo()).param("referencia", producto.referencia())
                .param("nombre", producto.nombre()).param("costo", producto.costo()).param("existencias", producto.existencias())
                .update();
    }

    public void actualizar(UUID tiendaId, Producto producto) {
        jdbc.sql("""
                update producto set referencia = :referencia, nombre = :nombre, costo = :costo, existencias = :existencias
                where tienda_id = :tienda and codigo = :codigo
                """)
                .param("tienda", tiendaId).param("codigo", producto.codigo()).param("referencia", producto.referencia())
                .param("nombre", producto.nombre()).param("costo", producto.costo()).param("existencias", producto.existencias())
                .update();
    }

    private static String escaparLike(String texto) {
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
