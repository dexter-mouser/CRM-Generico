package co.generico.comun;

import java.util.regex.Pattern;

/**
 * Reglas de validación del backend. Repite, una a una, las de src/core/validacion.js del frontend
 * (ver docs/validacion.md): cualquier cambio se hace en ambos lados.
 */
public final class Validaciones {

    public static final int TEXTO = 120;
    public static final int TEXTO_LARGO = 300;
    public static final int MOTIVO = 200;
    public static final int MOTIVO_MINIMO = 5;
    public static final long VALOR_MAXIMO = 1_000_000_000L;

    private static final Pattern CORREO = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern TELEFONO = Pattern.compile("^[\\d\\s()+-]{7,20}$");
    private static final Pattern CODIGO = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$");

    private Validaciones() {
    }

    /** Quita caracteres de control y espacios sobrantes. */
    public static String limpiar(String valor) {
        if (valor == null) {
            return "";
        }
        return valor.replaceAll("[\\u0000-\\u001f\\u007f]", " ").replaceAll("\\s+", " ").trim();
    }

    public static String texto(String valor, String etiqueta, boolean obligatorio, int maximo, int minimo) {
        String texto = limpiar(valor);
        if (obligatorio && texto.isEmpty()) {
            throw new ReglaDeNegocioException("Escribe " + etiqueta);
        }
        if (!texto.isEmpty() && texto.length() < minimo) {
            throw new ReglaDeNegocioException(mayuscula(etiqueta) + " debe tener al menos " + minimo + " caracteres");
        }
        if (texto.length() > maximo) {
            throw new ReglaDeNegocioException(mayuscula(etiqueta) + " no puede superar " + maximo + " caracteres");
        }
        return texto;
    }

    public static String texto(String valor, String etiqueta) {
        return texto(valor, etiqueta, true, TEXTO, 0);
    }

    public static String textoOpcional(String valor, String etiqueta, int maximo) {
        return texto(valor, etiqueta, false, maximo, 0);
    }

    public static long entero(Long valor, String etiqueta, long minimo, long maximo) {
        if (valor == null) {
            throw new ReglaDeNegocioException("Escribe " + etiqueta + " con un número entero");
        }
        if (valor < minimo) {
            throw new ReglaDeNegocioException(mayuscula(etiqueta) + " no puede ser menor que " + minimo);
        }
        if (valor > maximo) {
            throw new ReglaDeNegocioException(mayuscula(etiqueta) + " es demasiado grande");
        }
        return valor;
    }

    public static String correo(String valor, boolean obligatorio) {
        String correo = limpiar(valor).toLowerCase();
        if (correo.isEmpty() && !obligatorio) {
            return "";
        }
        if (!CORREO.matcher(correo).matches() || correo.length() > TEXTO) {
            throw new ReglaDeNegocioException("Escribe un correo válido, por ejemplo nombre@tienda.com");
        }
        return correo;
    }

    /** Las personas de la tienda usan siempre correo del dominio de la tienda. */
    public static String correoDeTienda(String valor) {
        String escrito = limpiar(valor).toLowerCase();
        String correo = !escrito.isEmpty() && !escrito.contains("@") ? escrito + "@generico.com" : escrito;
        correo(correo, true);
        if (!correo.endsWith("@generico.com")) {
            throw new ReglaDeNegocioException("El correo debe terminar en @generico.com");
        }
        return correo;
    }

    public static String telefono(String valor) {
        String telefono = limpiar(valor);
        if (!telefono.isEmpty() && !TELEFONO.matcher(telefono).matches()) {
            throw new ReglaDeNegocioException("El teléfono solo puede tener números, espacios, paréntesis, + y -");
        }
        return telefono;
    }

    /** ID de producto: vacío (se genera uno) o con el formato permitido. */
    public static String codigo(String valor) {
        String codigo = limpiar(valor);
        if (!codigo.isEmpty() && !CODIGO.matcher(codigo).matches()) {
            throw new ReglaDeNegocioException("El ID \"" + codigo + "\" solo puede tener letras, números, punto, guion y guion bajo");
        }
        return codigo;
    }

    public static String motivo(String valor) {
        return texto(valor, "el motivo", true, MOTIVO, MOTIVO_MINIMO);
    }

    private static String mayuscula(String texto) {
        return texto.isEmpty() ? texto : Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
    }
}
