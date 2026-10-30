package co.generico.seguridad;

import co.generico.configuracion.PropiedadesGenerico;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Sesión en un JWT firmado (HS256). Vence por inactividad (se renueva mientras se usa) y tiene un tope
 * absoluto desde el ingreso. El token solo identifica a la persona: sus permisos se leen de la base en cada petición.
 */
@Service
public class JwtServicio {

    public record Datos(UUID usuarioId, Instant iniciada, Instant emitida) {
    }

    private final SecretKey clave;
    private final Duration inactividad;
    private final Duration duracionMaxima;

    public JwtServicio(PropiedadesGenerico propiedades) {
        String secreto = propiedades.jwt().secreto();
        if (secreto == null || secreto.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRETO debe tener al menos 32 caracteres");
        }
        this.clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.inactividad = Duration.ofMinutes(propiedades.jwt().inactividadMinutos());
        this.duracionMaxima = Duration.ofHours(propiedades.jwt().duracionMaximaHoras());
    }

    public Duration inactividad() {
        return inactividad;
    }

    public String emitir(UUID usuarioId, Instant iniciada) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .subject(usuarioId.toString())
                .claim("ini", iniciada.getEpochSecond())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(inactividad)))
                .signWith(clave)
                .compact();
    }

    /** Devuelve los datos si la firma es válida, no venció por inactividad y no superó el tope absoluto. */
    public Optional<Datos> leer(String token) {
        try {
            Claims reclamos = Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload();
            Instant iniciada = Instant.ofEpochSecond(((Number) reclamos.get("ini")).longValue());
            if (Instant.now().isAfter(iniciada.plus(duracionMaxima))) {
                return Optional.empty();
            }
            return Optional.of(new Datos(UUID.fromString(reclamos.getSubject()), iniciada, reclamos.getIssuedAt().toInstant()));
        } catch (JwtException | IllegalArgumentException | NullPointerException | ClassCastException error) {
            return Optional.empty();
        }
    }
}
