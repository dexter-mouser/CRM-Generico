package co.generico.comun;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Números consecutivos por tienda, seguros con peticiones simultáneas.
 * siguiente(tienda, "C", 3) -> "C-001" (clientes). siguienteNumero(tienda, "DOC") -> 1, 2, 3... (documentos y notas).
 */
@Component
public class Consecutivos {

    private final JdbcClient jdbc;

    public Consecutivos(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public String siguiente(UUID tiendaId, String prefijo, int ancho) {
        return prefijo + "-" + String.format("%0" + ancho + "d", siguienteNumero(tiendaId, prefijo));
    }

    /** Siguiente número de la clave indicada, sin prefijo ni relleno. */
    public long siguienteNumero(UUID tiendaId, String clave) {
        return jdbc.sql("""
                insert into consecutivo (tienda_id, clave, ultimo) values (:tienda, :clave, 1)
                on conflict (tienda_id, clave) do update set ultimo = consecutivo.ultimo + 1
                returning ultimo
                """)
                .param("tienda", tiendaId)
                .param("clave", clave)
                .query(Long.class)
                .single();
    }
}
