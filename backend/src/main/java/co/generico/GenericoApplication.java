package co.generico;

import co.generico.configuracion.PropiedadesGenerico;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(PropiedadesGenerico.class)
public class GenericoApplication {

    public static void main(String[] argumentos) {
        SpringApplication.run(GenericoApplication.class, argumentos);
    }
}
