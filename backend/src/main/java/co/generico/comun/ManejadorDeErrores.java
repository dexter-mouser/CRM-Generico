package co.generico.comun;

import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Todas las respuestas de error tienen la forma { "mensaje": "..." }, que la interfaz muestra tal cual. */
@RestControllerAdvice
public class ManejadorDeErrores {

    private static final Logger registro = LoggerFactory.getLogger(ManejadorDeErrores.class);

    private static ResponseEntity<Map<String, String>> responder(HttpStatus estado, String mensaje) {
        return ResponseEntity.status(estado).body(Map.of("mensaje", mensaje));
    }

    @ExceptionHandler(ReglaDeNegocioException.class)
    ResponseEntity<Map<String, String>> reglaDeNegocio(ReglaDeNegocioException error) {
        return responder(HttpStatus.BAD_REQUEST, error.getMessage());
    }

    @ExceptionHandler(NoEncontradoException.class)
    ResponseEntity<Map<String, String>> noEncontrado(NoEncontradoException error) {
        return responder(HttpStatus.NOT_FOUND, error.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Map<String, String>> sinPermiso(AccessDeniedException error) {
        return responder(HttpStatus.FORBIDDEN, "Tu rol no tiene permiso para realizar esta acción");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> cuerpoInvalido(MethodArgumentNotValidException error) {
        String detalle = error.getBindingResult().getFieldErrors().stream()
                .map(campo -> campo.getField() + ": " + campo.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return responder(HttpStatus.BAD_REQUEST, "Datos inválidos (" + detalle + ")");
    }

    @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class})
    ResponseEntity<Map<String, String>> peticionMalFormada(Exception error) {
        return responder(HttpStatus.BAD_REQUEST, "La petición no tiene un formato válido");
    }

    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<Map<String, String>> duplicado(DuplicateKeyException error) {
        return responder(HttpStatus.BAD_REQUEST, "Ese registro ya existe");
    }

    /** Cualquier otro error: se registra con detalle en el servidor y a la persona solo se le dice que falló. */
    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> inesperado(Exception error) {
        registro.error("Error inesperado", error);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo completar la operación. Inténtalo de nuevo.");
    }
}
