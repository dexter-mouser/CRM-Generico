package co.generico.comun;

/** Recurso que no existe en la tienda de la persona. Responde 404. */
public class NoEncontradoException extends RuntimeException {

    public NoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
