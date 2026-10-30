package co.generico.comun;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Números consecutivos por tienda: siguiente(tienda, "V", 4) -> "V-0001". Seguro con peticiones simultáneas. */
@Component
public class Consecutivos {

    private final JdbcClient jdbc;

    public Consecutivos(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public String siguiente(UUID tiendaId, String prefijo, int ancho) {
        long numero = jdbc.sql("""
                insert into consecutivo (tienda_id, clave, ultimo) values (:tienda, :clave, 1)
                on conflict (tienda_id, clave) do update set ultimo = consecutivo.ultimo + 1
                returning ultimo
                """)
                .param("tienda", tiendaId)
                .param("clave", prefijo)
                .query(Long.class)
                .single();
        return prefijo + "-" + String.format("%0" + ancho + "d", numero);
    }
}
