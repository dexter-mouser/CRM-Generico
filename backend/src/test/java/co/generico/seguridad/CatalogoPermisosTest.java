package co.generico.seguridad;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CatalogoPermisosTest {

    @Test
    void sinVerNoQuedaNada() {
        Map<String, List<String>> limpios = CatalogoPermisos.normalizar(Map.of("ventas", List.of("eliminar")));
        assertFalse(limpios.containsKey("ventas"));
    }

    @Test
    void descartaModulosYAccionesQueNoExisten() {
        Map<String, List<String>> limpios = CatalogoPermisos.normalizar(Map.of(
                "ventas", List.of("ver", "eliminar", "crear"),
                "modulo-falso", List.of("ver")));
        assertEquals(List.of("ver", "eliminar"), limpios.get("ventas"));
        assertFalse(limpios.containsKey("modulo-falso"));
    }

    @Test
    void reabrirSoloExisteEnContabilidad() {
        Map<String, List<String>> limpios = CatalogoPermisos.normalizar(Map.of(
                "contabilidad", List.of("ver", "reabrir"),
                "caja", List.of("ver", "reabrir")));
        assertTrue(limpios.get("contabilidad").contains("reabrir"));
        assertFalse(limpios.get("caja").contains("reabrir"));
    }

    @Test
    void elPropietarioTieneTodosLosPermisos() {
        assertTrue(CatalogoPermisos.todos().contains("contabilidad:reabrir"));
        assertTrue(CatalogoPermisos.todos().contains("ventas:eliminar"));
    }
}
