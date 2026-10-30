package co.generico.producto;

import co.generico.seguridad.UsuarioActual;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/productos")
public class ProductoControlador {

    private final ProductoServicio servicio;
    private final UsuarioActual actual;

    public ProductoControlador(ProductoServicio servicio, UsuarioActual actual) {
        this.servicio = servicio;
        this.actual = actual;
    }

    @GetMapping
    @PreAuthorize("@permisos.puede('inventario', 'ver') or @permisos.puede('nueva-venta', 'crear')")
    public List<Producto> buscar(@RequestParam(defaultValue = "") String consulta) {
        return servicio.buscar(actual.obtener(), consulta);
    }

    @PostMapping
    @PreAuthorize("@permisos.puede('inventario', 'crear')")
    public Producto crear(@RequestBody ProductoServicio.DatosProducto datos) {
        return servicio.crear(actual.obtener(), datos);
    }

    @PutMapping("/{codigo}")
    @PreAuthorize("@permisos.puede('inventario', 'editar')")
    public Producto actualizar(@PathVariable String codigo, @RequestBody ProductoServicio.DatosProducto cambios) {
        return servicio.actualizar(actual.obtener(), codigo, cambios);
    }

    @PostMapping("/importacion")
    @PreAuthorize("@permisos.puede('inventario', 'crear')")
    public ProductoServicio.ResultadoImportacion importar(@RequestBody List<ProductoServicio.DatosProducto> filas) {
        return servicio.importar(actual.obtener(), filas);
    }
}
