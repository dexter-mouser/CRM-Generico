package co.generico.seguridad;

import co.generico.configuracion.PropiedadesGenerico;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class ConfiguracionSeguridad {

    @Bean
    SecurityFilterChain cadena(HttpSecurity http, SesionFiltro sesion) throws Exception {
        http
                // Sin sesión de servidor: la sesión viaja en el JWT. La defensa CSRF la hace SesionFiltro.
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sesiones -> sesiones.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(cabeceras -> cabeceras
                        .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "geolocation=(), camera=(), microphone=()")))
                .authorizeHttpRequests(rutas -> rutas
                        .requestMatchers("/api/auth/ingreso", "/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(errores -> errores
                        .authenticationEntryPoint((peticion, respuesta, error) ->
                                escribirError(respuesta, 401, "Tu sesión venció. Ingresa de nuevo."))
                        .accessDeniedHandler((peticion, respuesta, error) ->
                                escribirError(respuesta, 403, "Tu rol no tiene permiso para realizar esta acción")))
                .addFilterBefore(sesion, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void escribirError(jakarta.servlet.http.HttpServletResponse respuesta, int estado, String mensaje)
            throws java.io.IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType(MediaType.APPLICATION_JSON_VALUE);
        respuesta.setCharacterEncoding(StandardCharsets.UTF_8.name());
        respuesta.getWriter().write("{\"mensaje\":\"" + mensaje + "\"}");
    }

    /** CORS limitado a los orígenes de la aplicación (nunca comodín, porque se envían cookies). */
    @Bean
    CorsConfigurationSource cors(PropiedadesGenerico propiedades) {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOrigins(propiedades.cors().origenes());
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("Content-Type", SesionFiltro.ENCABEZADO_CSRF));
        configuracion.setAllowCredentials(true);
        configuracion.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource origen = new UrlBasedCorsConfigurationSource();
        origen.registerCorsConfiguration("/api/**", configuracion);
        return origen;
    }

    /** Contraseñas con BCrypt y sal; nunca se guardan ni se registran en claro. */
    @Bean
    PasswordEncoder codificadorDeClaves() {
        return new BCryptPasswordEncoder(12);
    }
}
