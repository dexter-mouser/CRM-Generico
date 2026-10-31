package co.generico.comun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

/** Las mismas reglas que src/core/validacion.js del frontend (docs/validacion.md). */
class ValidacionesTest {

    @Test
    void textoLimpiaEspaciosYCaracteresDeControl() {
        assertEquals("Dog Chow 4 kg", Validaciones.limpiar("  Dog\u0000   Chow\t4 kg  "));
    }

    @Test
    void textoObligatorioVacioFalla() {
        ReglaDeNegocioException error = assertThrows(ReglaDeNegocioException.class,
                () -> Validaciones.texto("   ", "el nombre del producto"));
        assertEquals("Escribe el nombre del producto", error.getMessage());
    }

    @Test
    void textoMuyLargoFalla() {
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.texto("a".repeat(121), "el nombre"));
    }

    @Test
    void motivoExigeCincoCaracteres() {
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.motivo("x"));
        assertEquals("Producto dañado", Validaciones.motivo("  Producto dañado "));
    }

    @Test
    void enteroRespetaLimites() {
        assertEquals(10, Validaciones.entero(10L, "el costo", 0, Validaciones.VALOR_MAXIMO));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.entero(-1L, "el costo", 0, Validaciones.VALOR_MAXIMO));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.entero(null, "el costo", 0, Validaciones.VALOR_MAXIMO));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.entero(Validaciones.VALOR_MAXIMO + 1, "el costo", 0, Validaciones.VALOR_MAXIMO));
    }

    @Test
    void correoYTelefono() {
        assertEquals("a@b.co", Validaciones.correo(" A@B.co ", true));
        assertEquals("", Validaciones.correo("", false));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.correo("no-es-correo", true));
        assertEquals("604 555 0100", Validaciones.telefono("604 555 0100"));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.telefono("abc"));
    }

    @Test
    void codigoDeProducto() {
        assertEquals("", Validaciones.codigo("  "));
        assertEquals("1", Validaciones.codigo("1"));
        assertEquals("7", Validaciones.codigo("007"));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.codigo("P-001"));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.codigo("Z 2"));
        assertThrows(ReglaDeNegocioException.class, () -> Validaciones.codigo("1234567890123"));
    }
}
