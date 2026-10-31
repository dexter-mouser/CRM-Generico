package co.generico.producto;

import co.generico.auditoria.AuditoriaServicio;
import co.generico.comun.NoEncontradoException;
import co.generico.comun.ReglaDeNegocioException;
import co.generico.comun.Validaciones;
import co.generico.seguridad.UsuarioSesion;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductoServicio {

    /** Datos de un producto tal como llegan (creación, edición parcial o fila de un CSV). Los nulos significan "no cambia". */
    public record DatosProducto(String id, String referencia, String nombre, Long costo, Long existencias) {
    }

    public record ResultadoImportacion(int agregados, int actualizados) {
    }

    static final int MAXIMO_FILAS_IMPORTACION = 5000;

    private final ProductoRepositorio repositorio;
    private final AuditoriaServicio auditoria;

    public ProductoServicio(ProductoRepositorio repositorio, AuditoriaServicio auditoria) {
        this.repositorio = repositorio;
        this.auditoria = auditoria;
    }

    public List<Producto> buscar(UsuarioSesion quien, String consulta) {
        return repositorio.buscar(quien.tiendaId(), consulta == null ? "" : consulta);
    }

    /** Valida todos los campos de un producto con las mismas reglas de src/core/validacion.js. */
    static Producto validar(DatosProducto datos, String codigo) {
        return new Producto(
                codigo,
                Validaciones.textoOpcional(datos.referencia(), "la referencia", 40),
                Validaciones.texto(datos.nombre(), "el nombre del producto"),
                Validaciones.entero(datos.costo(), "el costo", 0, Validaciones.VALOR_MAXIMO),
                (int) Validaciones.entero(datos.existencias(), "el stock", -Validaciones.VALOR_MAXIMO, Validaciones.VALOR_MAXIMO));
    }

    @Transactional
    public Producto crear(UsuarioSesion quien, DatosProducto datos) {
        String codigoPedido = Validaciones.codigo(datos.id());
        String codigo = codigoPedido.isEmpty() ? repositorio.siguienteCodigo(quien.tiendaId()) : codigoPedido;
        Producto producto = validar(datos, codigo);
        if (repositorio.buscarPorCodigo(quien.tiendaId(), codigo).isPresent()) {
            throw new ReglaDeNegocioException("Ya existe un producto con el ID " + codigo);
        }
        repositorio.insertar(quien.tiendaId(), producto);
        auditoria.registrar(quien, "inventario", "Producto creado", codigo + " · " + producto.nombre());
        return producto;
    }

    /** Edición parcial: solo cambian los campos enviados. El ID no se edita porque lo usan las ventas y las facturas. */
    @Transactional
    public Producto actualizar(UsuarioSesion quien, String codigo, DatosProducto cambios) {
        Producto actual = repositorio.buscarPorCodigo(quien.tiendaId(), codigo)
                .orElseThrow(() -> new NoEncontradoException("El producto no existe"));
        Producto nuevo = validar(new DatosProducto(codigo,
                cambios.referencia() != null ? cambios.referencia() : actual.referencia(),
                cambios.nombre() != null ? cambios.nombre() : actual.nombre(),
                cambios.costo() != null ? cambios.costo() : Long.valueOf(actual.costo()),
                cambios.existencias() != null ? cambios.existencias() : Long.valueOf(actual.existencias())), codigo);
        repositorio.actualizar(quien.tiendaId(), nuevo);
        auditoria.registrar(quien, "inventario", "Producto editado", codigo + " · " + nuevo.nombre());
        return nuevo;
    }

    /**
     * Importación validada: se revisan todas las filas antes de cambiar nada. Si alguna falla no se importa ninguna
     * y el mensaje dice en qué fila está el problema (la fila 1 del archivo es el encabezado).
     */
    @Transactional
    public ResultadoImportacion importar(UsuarioSesion quien, List<DatosProducto> filas) {
        if (filas == null || filas.isEmpty()) {
            throw new ReglaDeNegocioException("El archivo no tiene productos");
        }
        if (filas.size() > MAXIMO_FILAS_IMPORTACION) {
            throw new ReglaDeNegocioException("El archivo tiene demasiadas filas (máximo " + MAXIMO_FILAS_IMPORTACION + ")");
        }
        List<String> problemas = new ArrayList<>();
        Set<String> vistos = new HashSet<>();
        List<Producto> validas = new ArrayList<>();
        for (int posicion = 0; posicion < filas.size(); posicion++) {
            try {
                DatosProducto fila = filas.get(posicion);
                String codigo = Validaciones.codigo(fila.id());
                if (!codigo.isEmpty() && !vistos.add(codigo)) {
                    throw new ReglaDeNegocioException("el ID " + codigo + " está repetido en el archivo");
                }
                validas.add(validar(fila, codigo));
            } catch (ReglaDeNegocioException error) {
                problemas.add("Fila " + (posicion + 2) + ": " + error.getMessage());
            }
        }
        if (!problemas.isEmpty()) {
            String resto = problemas.size() > 3 ? " (y " + (problemas.size() - 3) + " más)" : "";
            throw new ReglaDeNegocioException("No se importó nada. " + String.join(" · ", problemas.subList(0, Math.min(3, problemas.size()))) + resto);
        }

        int agregados = 0;
        int actualizados = 0;
        for (Producto fila : validas) {
            if (!fila.codigo().isEmpty() && repositorio.buscarPorCodigo(quien.tiendaId(), fila.codigo()).isPresent()) {
                repositorio.actualizar(quien.tiendaId(), fila);
                actualizados++;
            } else {
                String codigo = fila.codigo().isEmpty() ? repositorio.siguienteCodigo(quien.tiendaId()) : fila.codigo();
                repositorio.insertar(quien.tiendaId(), new Producto(codigo, fila.referencia(), fila.nombre(), fila.costo(), fila.existencias()));
                agregados++;
            }
        }
        auditoria.registrar(quien, "inventario", "Inventario importado", agregados + " nuevos, " + actualizados + " actualizados");
        return new ResultadoImportacion(agregados, actualizados);
    }
}
