package co.generico.seguridad;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Módulos y acciones disponibles. Es la misma tabla que src/config/permisos.js del frontend. */
public final class CatalogoPermisos {

    private static final List<String> BASICAS = List.of("ver", "crear", "editar", "eliminar");

    public static final Map<String, List<String>> ACCIONES_POR_MODULO = new LinkedHashMap<>();

    static {
        ACCIONES_POR_MODULO.put("panel", List.of("ver"));
        ACCIONES_POR_MODULO.put("nueva-venta", List.of("ver", "crear"));
        ACCIONES_POR_MODULO.put("ventas", List.of("ver", "eliminar"));
        ACCIONES_POR_MODULO.put("clientes", BASICAS);
        ACCIONES_POR_MODULO.put("seguimiento", BASICAS);
        ACCIONES_POR_MODULO.put("embudo", List.of("ver", "editar"));
        ACCIONES_POR_MODULO.put("inventario", BASICAS);
        ACCIONES_POR_MODULO.put("proveedores", BASICAS);
        ACCIONES_POR_MODULO.put("caja", BASICAS);
        ACCIONES_POR_MODULO.put("contabilidad", List.of("ver", "crear", "reabrir"));
        ACCIONES_POR_MODULO.put("pagos", BASICAS);
        ACCIONES_POR_MODULO.put("reportes", List.of("ver"));
        ACCIONES_POR_MODULO.put("auditoria", List.of("ver"));
        ACCIONES_POR_MODULO.put("roles", BASICAS);
        ACCIONES_POR_MODULO.put("ajustes", List.of("ver", "editar"));
    }

    private CatalogoPermisos() {
    }

    /** Todos los permisos, con el formato "modulo:accion" (los del rol Propietario). */
    public static Set<String> todos() {
        List<String> lista = new ArrayList<>();
        ACCIONES_POR_MODULO.forEach((modulo, acciones) -> acciones.forEach(accion -> lista.add(modulo + ":" + accion)));
        return lista.stream().collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Limpia los permisos que envía el cliente: descarta módulos y acciones que no existen y aplica la regla
     * "sin Ver no hay nada": un módulo sin la acción ver queda sin permisos.
     */
    public static Map<String, List<String>> normalizar(Map<String, List<String>> pedidos) {
        Map<String, List<String>> limpios = new LinkedHashMap<>();
        ACCIONES_POR_MODULO.forEach((modulo, validas) -> {
            List<String> pedidas = pedidos.getOrDefault(modulo, List.of());
            if (!pedidas.contains("ver")) {
                return;
            }
            limpios.put(modulo, validas.stream().filter(pedidas::contains).toList());
        });
        return limpios;
    }
}
