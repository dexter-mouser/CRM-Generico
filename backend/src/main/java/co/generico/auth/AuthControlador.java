package co.generico.auth;

import co.generico.auditoria.AuditoriaServicio;
import co.generico.seguridad.CatalogoPermisos;
import co.generico.seguridad.CookieSesion;
import co.generico.seguridad.UsuarioActual;
import co.generico.seguridad.UsuarioSesion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthControlador {

    public record SolicitudIngreso(@NotBlank @Size(max = 120) String correo, @NotBlank @Size(max = 200) String clave) {
    }

    public record Yo(String nombre, String correo, String rol, boolean protegido, Map<String, List<String>> permisos) {
    }

    private final AuthServicio servicio;
    private final LimitadorDeIntentos limitador;
    private final CookieSesion cookie;
    private final UsuarioActual actual;
    private final AuditoriaServicio auditoria;

    public AuthControlador(AuthServicio servicio, LimitadorDeIntentos limitador, CookieSesion cookie,
            UsuarioActual actual, AuditoriaServicio auditoria) {
        this.servicio = servicio;
        this.limitador = limitador;
        this.cookie = cookie;
        this.actual = actual;
        this.auditoria = auditoria;
    }

    @PostMapping("/ingreso")
    public ResponseEntity<?> ingresar(@Valid @RequestBody SolicitudIngreso solicitud, HttpServletRequest peticion,
            HttpServletResponse respuesta) {
        if (!limitador.permitir(peticion.getRemoteAddr())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("mensaje", "Demasiados intentos desde este dispositivo. Espera unos minutos."));
        }
        try {
            cookie.escribir(respuesta, servicio.ingresar(solicitud.correo(), solicitud.clave()));
            return ResponseEntity.noContent().build();
        } catch (AuthServicio.BloqueadoException bloqueo) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("mensaje", bloqueo.getMessage()));
        }
    }

    @PostMapping("/salida")
    public ResponseEntity<Void> salir(HttpServletResponse respuesta) {
        actual.opcional().ifPresent(usuario -> auditoria.registrar(usuario, "acceso", "Salida", usuario.correo()));
        cookie.borrar(respuesta);
        return ResponseEntity.noContent().build();
    }

    /** Quién soy y qué puedo hacer: con esto la interfaz muestra u oculta módulos. */
    @GetMapping("/yo")
    public Yo yo() {
        UsuarioSesion usuario = actual.obtener();
        Map<String, List<String>> permisos = new LinkedHashMap<>();
        CatalogoPermisos.ACCIONES_POR_MODULO.forEach((modulo, acciones) -> {
            List<String> permitidas = new ArrayList<>(acciones.stream().filter(accion -> usuario.puede(modulo, accion)).toList());
            if (!permitidas.isEmpty()) {
                permisos.put(modulo, permitidas);
            }
        });
        return new Yo(usuario.nombre(), usuario.correo(), usuario.rolNombre(), usuario.protegido(), permisos);
    }
}
