package co.generico.auth;

import co.generico.auditoria.AuditoriaServicio;
import co.generico.comun.ReglaDeNegocioException;
import co.generico.seguridad.JwtServicio;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** Ingreso con correo y clave. El ingreso con Google (OIDC) se agrega después sobre la misma cookie de sesión. */
@Service
public class AuthServicio {

    /** Se responde igual haya o no una cuenta, para no revelar qué correos existen. */
    static final String MENSAJE_INCORRECTO = "Correo o clave incorrectos. Revisa los datos e inténtalo de nuevo.";
    static final int MAXIMO_INTENTOS = 5;
    static final Duration BLOQUEO = Duration.ofMinutes(5);

    public static class BloqueadoException extends RuntimeException {
        public BloqueadoException(String mensaje) {
            super(mensaje);
        }
    }

    private record Cuenta(UUID id, UUID tiendaId, String nombre, String claveHash, int intentosFallidos, OffsetDateTime bloqueadoHasta) {
    }

    private final JdbcClient jdbc;
    private final PasswordEncoder codificador;
    private final JwtServicio jwt;
    private final AuditoriaServicio auditoria;
    // Hash de relleno: se compara aunque la cuenta no exista, para que la respuesta tarde lo mismo
    private final String hashDeRelleno;

    public AuthServicio(JdbcClient jdbc, PasswordEncoder codificador, JwtServicio jwt, AuditoriaServicio auditoria) {
        this.jdbc = jdbc;
        this.codificador = codificador;
        this.jwt = jwt;
        this.auditoria = auditoria;
        this.hashDeRelleno = codificador.encode(UUID.randomUUID().toString());
    }

    /** Devuelve el token de sesión si el correo y la clave son correctos. */
    public String ingresar(String correo, String clave) {
        String correoLimpio = correo == null ? "" : correo.trim().toLowerCase();
        Optional<Cuenta> cuenta = jdbc.sql("""
                select id, tienda_id, nombre, clave_hash, intentos_fallidos, bloqueado_hasta
                from usuario where lower(correo) = :correo and activo
                """)
                .param("correo", correoLimpio)
                .query(Cuenta.class)
                .optional();

        if (cuenta.isPresent() && cuenta.get().bloqueadoHasta() != null && cuenta.get().bloqueadoHasta().isAfter(OffsetDateTime.now())) {
            long minutos = Math.max(1, Duration.between(OffsetDateTime.now(), cuenta.get().bloqueadoHasta()).toMinutes() + 1);
            throw new BloqueadoException("Demasiados intentos fallidos. Espera " + minutos + " minuto(s) e inténtalo de nuevo.");
        }

        String hash = cuenta.map(Cuenta::claveHash).filter(valor -> valor != null).orElse(hashDeRelleno);
        boolean correcta = codificador.matches(clave == null ? "" : clave, hash) && cuenta.isPresent() && cuenta.get().claveHash() != null;

        if (!correcta) {
            cuenta.ifPresent(this::registrarFallo);
            auditoria.registrar(cuenta.map(Cuenta::tiendaId).orElse(null), "Sin identificar", "acceso",
                    "Intento de ingreso fallido", correoLimpio);
            throw new ReglaDeNegocioException(MENSAJE_INCORRECTO);
        }

        jdbc.sql("update usuario set intentos_fallidos = 0, bloqueado_hasta = null where id = :id")
                .param("id", cuenta.get().id())
                .update();
        auditoria.registrar(cuenta.get().tiendaId(), cuenta.get().nombre(), "acceso", "Ingreso", correoLimpio);
        return jwt.emitir(cuenta.get().id(), Instant.now());
    }

    private void registrarFallo(Cuenta cuenta) {
        int fallos = cuenta.intentosFallidos() + 1;
        if (fallos >= MAXIMO_INTENTOS) {
            jdbc.sql("update usuario set intentos_fallidos = 0, bloqueado_hasta = :hasta where id = :id")
                    .param("hasta", OffsetDateTime.now().plus(BLOQUEO))
                    .param("id", cuenta.id())
                    .update();
        } else {
            jdbc.sql("update usuario set intentos_fallidos = :fallos where id = :id")
                    .param("fallos", fallos)
                    .param("id", cuenta.id())
                    .update();
        }
    }
}
