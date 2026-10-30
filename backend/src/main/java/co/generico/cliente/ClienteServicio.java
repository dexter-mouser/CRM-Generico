package co.generico.cliente;

import co.generico.auditoria.AuditoriaServicio;
import co.generico.comun.Consecutivos;
import co.generico.comun.NoEncontradoException;
import co.generico.comun.ReglaDeNegocioException;
import co.generico.comun.Validaciones;
import co.generico.seguridad.UsuarioSesion;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClienteServicio {

    public record DatosCliente(String nombre, String telefono, String correo, String direccion) {
    }

    private final ClienteRepositorio repositorio;
    private final Consecutivos consecutivos;
    private final AuditoriaServicio auditoria;

    public ClienteServicio(ClienteRepositorio repositorio, Consecutivos consecutivos, AuditoriaServicio auditoria) {
        this.repositorio = repositorio;
        this.consecutivos = consecutivos;
        this.auditoria = auditoria;
    }

    public List<Cliente> buscar(UsuarioSesion quien, String consulta) {
        return repositorio.buscar(quien.tiendaId(), consulta == null ? "" : consulta);
    }

    public List<String> ventasDe(UsuarioSesion quien, String codigo) {
        Cliente cliente = obtener(quien.tiendaId(), codigo);
        return repositorio.ventasDe(quien.tiendaId(), cliente.nombre());
    }

    private Cliente obtener(UUID tiendaId, String codigo) {
        return repositorio.buscarPorCodigo(tiendaId, codigo).orElseThrow(() -> new NoEncontradoException("El cliente no existe"));
    }

    private Cliente limpiar(UUID tiendaId, DatosCliente datos, String codigoActual) {
        Cliente limpio = new Cliente(
                codigoActual,
                Validaciones.texto(datos.nombre(), "el nombre del cliente"),
                Validaciones.telefono(datos.telefono()),
                Validaciones.correo(datos.correo(), false),
                Validaciones.textoOpcional(datos.direccion(), "la dirección", Validaciones.TEXTO_LARGO),
                0);
        repositorio.buscarPorNombre(tiendaId, limpio.nombre()).ifPresent(existente -> {
            if (!existente.codigo().equals(codigoActual)) {
                throw new ReglaDeNegocioException("Ya existe un cliente llamado " + limpio.nombre());
            }
        });
        return limpio;
    }

    @Transactional
    public Cliente crear(UsuarioSesion quien, DatosCliente datos) {
        Cliente limpio = limpiar(quien.tiendaId(), datos, null);
        String codigo = consecutivos.siguiente(quien.tiendaId(), "C", 3);
        repositorio.insertar(quien.tiendaId(), new Cliente(codigo, limpio.nombre(), limpio.telefono(), limpio.correo(), limpio.direccion(), 0));
        auditoria.registrar(quien, "clientes", "Cliente creado", codigo + " · " + limpio.nombre());
        return obtener(quien.tiendaId(), codigo);
    }

    @Transactional
    public Cliente actualizar(UsuarioSesion quien, String codigo, DatosCliente datos) {
        Cliente actual = obtener(quien.tiendaId(), codigo);
        Cliente limpio = limpiar(quien.tiendaId(), datos, codigo);
        if (!limpio.nombre().equals(actual.nombre())) {
            repositorio.renombrarEnMovimientos(quien.tiendaId(), actual.nombre(), limpio.nombre());
        }
        repositorio.actualizar(quien.tiendaId(), codigo, limpio);
        auditoria.registrar(quien, "clientes", "Cliente editado", codigo + " · " + limpio.nombre());
        return obtener(quien.tiendaId(), codigo);
    }

    @Transactional
    public void eliminar(UsuarioSesion quien, String codigo) {
        Cliente cliente = obtener(quien.tiendaId(), codigo);
        if (cliente.deuda() > 0) {
            throw new ReglaDeNegocioException(cliente.nombre() + " tiene una deuda pendiente: registra el abono antes de eliminarlo");
        }
        repositorio.eliminar(quien.tiendaId(), codigo);
        auditoria.registrar(quien, "clientes", "Cliente eliminado", codigo + " · " + cliente.nombre());
    }
}
