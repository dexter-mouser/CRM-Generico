package co.generico.seguridad;

import co.generico.configuracion.PropiedadesGenerico;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

/** Cookie de sesión: HttpOnly (el JavaScript no la ve), Secure en producción y SameSite=Strict. */
@Component
public class CookieSesion {

    public static final String NOMBRE = "generico_sesion";

    private final boolean segura;
    private final JwtServicio jwt;

    public CookieSesion(PropiedadesGenerico propiedades, JwtServicio jwt) {
        this.segura = propiedades.cookie().segura();
        this.jwt = jwt;
    }

    public Optional<String> leer(HttpServletRequest peticion) {
        return Optional.ofNullable(WebUtils.getCookie(peticion, NOMBRE)).map(cookie -> cookie.getValue());
    }

    public void escribir(HttpServletResponse respuesta, String token) {
        respuesta.addHeader(HttpHeaders.SET_COOKIE, construir(token, jwt.inactividad()).toString());
    }

    public void borrar(HttpServletResponse respuesta) {
        respuesta.addHeader(HttpHeaders.SET_COOKIE, construir("", Duration.ZERO).toString());
    }

    private ResponseCookie construir(String valor, Duration duracion) {
        return ResponseCookie.from(NOMBRE, valor)
                .httpOnly(true)
                .secure(segura)
                .sameSite("Strict")
                .path("/api")
                .maxAge(duracion)
                .build();
    }
}
