package co.generico.tienda;

import co.generico.comun.NoEncontradoException;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TiendaRepositorio {

    private record Fila(UUID id, String nombre, boolean permitirSinExistencias, String metodosPago, String zonaHoraria) {
    }

    /** Ajustes de la tienda que consultan las reglas de ventas. */
    public record Tienda(UUID id, String nombre, boolean permitirSinExistencias, List<String> metodosPago, ZoneId zona) {
    }

    private final JdbcClient jdbc;

    public TiendaRepositorio(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Tienda obtener(UUID tiendaId) {
        Fila fila = jdbc.sql("select id, nombre, permitir_sin_existencias, metodos_pago, zona_horaria from tienda where id = :id")
                .param("id", tiendaId)
                .query(Fila.class).optional()
                .orElseThrow(() -> new NoEncontradoException("La tienda no existe"));
        return new Tienda(fila.id(), fila.nombre(), fila.permitirSinExistencias(),
                Arrays.stream(fila.metodosPago().split(",")).map(String::trim).filter(metodo -> !metodo.isEmpty()).toList(),
                ZoneId.of(fila.zonaHoraria()));
    }
}
