package co.generico.configuracion;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Propiedades propias de la aplicación (prefijo "generico" en application.yml). */
@ConfigurationProperties(prefix = "generico")
public record PropiedadesGenerico(Jwt jwt, Cookie cookie, Cors cors, Demo demo) {

    public record Jwt(String secreto, int inactividadMinutos, int duracionMaximaHoras) {
    }

    public record Cookie(boolean segura) {
    }

    public record Cors(List<String> origenes) {
    }

    public record Demo(boolean sembrar, String clave) {
    }
}
