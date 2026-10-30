package co.generico.comun;

/** Error que se le muestra a la persona tal cual (mensaje en español). Responde 400. */
public class ReglaDeNegocioException extends RuntimeException {

    public ReglaDeNegocioException(String mensaje) {
        super(mensaje);
    }
}
