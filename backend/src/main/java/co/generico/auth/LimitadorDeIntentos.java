package co.generico.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/** Límite de intentos de ingreso por dirección IP (20 cada 10 minutos). Está en memoria: con varias instancias se pasa a Redis. */
@Component
public class LimitadorDeIntentos {

    private static final int MAXIMO = 20;
    private static final Duration VENTANA = Duration.ofMinutes(10);

    private final ConcurrentHashMap<String, Deque<Instant>> intentos = new ConcurrentHashMap<>();

    /** Registra el intento y dice si se permite. */
    public boolean permitir(String ip) {
        Instant ahora = Instant.now();
        Deque<Instant> cola = intentos.computeIfAbsent(ip, clave -> new ArrayDeque<>());
        synchronized (cola) {
            while (!cola.isEmpty() && cola.peekFirst().isBefore(ahora.minus(VENTANA))) {
                cola.pollFirst();
            }
            if (cola.size() >= MAXIMO) {
                return false;
            }
            cola.addLast(ahora);
            return true;
        }
    }
}
