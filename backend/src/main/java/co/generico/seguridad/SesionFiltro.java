package co.generico.seguridad;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Hace dos cosas en cada petición a /api:
 * 1. Protección CSRF: las escrituras (POST, PUT, PATCH, DELETE) deben traer el encabezado X-Generico. Un sitio ajeno no puede
 *    enviarlo sin un permiso CORS previo, que solo se concede a los orígenes de la aplicación; además la cookie es SameSite=Strict.
 * 2. Lee la cookie de sesión, carga a la persona y renueva el token mientras la use.
 */
@Component
public class SesionFiltro extends OncePerRequestFilter {

    public static final String ENCABEZADO_CSRF = "X-Generico";
    private static final Set<String> ESCRITURAS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Duration RENOVAR_DESPUES_DE = Duration.ofMinutes(5);

    private final JwtServicio jwt;
    private final CookieSesion cookie;
    private final UsuarioSesionRepositorio usuarios;

    public SesionFiltro(JwtServicio jwt, CookieSesion cookie, UsuarioSesionRepositorio usuarios) {
        this.jwt = jwt;
        this.cookie = cookie;
        this.usuarios = usuarios;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest peticion) {
        return !peticion.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        if (ESCRITURAS.contains(peticion.getMethod()) && !"1".equals(peticion.getHeader(ENCABEZADO_CSRF))) {
            respuesta.setStatus(HttpServletResponse.SC_FORBIDDEN);
            respuesta.setContentType(MediaType.APPLICATION_JSON_VALUE);
            respuesta.setCharacterEncoding(StandardCharsets.UTF_8.name());
            respuesta.getWriter().write("{\"mensaje\":\"Petición no autorizada\"}");
            return;
        }

        cookie.leer(peticion).flatMap(jwt::leer).ifPresent(datos -> {
            Optional<UsuarioSesion> usuario = usuarios.cargar(datos.usuarioId());
            if (usuario.isEmpty()) {
                return;
            }
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(usuario.get(), null, AuthorityUtils.NO_AUTHORITIES));
            if (Duration.between(datos.emitida(), Instant.now()).compareTo(RENOVAR_DESPUES_DE) > 0) {
                cookie.escribir(respuesta, jwt.emitir(datos.usuarioId(), datos.iniciada()));
            }
        });
        cadena.doFilter(peticion, respuesta);
    }
}
