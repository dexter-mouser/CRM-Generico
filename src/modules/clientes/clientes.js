import { buscar } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { cargarHtml, seccion, repetir, rellenar } from '../../core/template.js';
import { resumirItems } from '../../services/ventas.service.js';
import * as servicioClientes from '../../services/clientes.service.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';

let documento;
let plantillasCuadricula;

export async function dibujar() {
  documento = await cargarHtml(new URL('./clientes.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  return seccion(documento, 'principal');
}

export function montar(raiz, contexto) {
  let clienteEnEdicion = null; // id del cliente que se edita; null si se crea uno nuevo
  let clientePorEliminar = null;
  const campos = ['nombre', 'telefono', 'correo', 'direccion'];
  const campo = (nombre) => buscar(`#cliente-${nombre}`, raiz);

  const ejecutar = (accion, mensaje) => {
    try {
      accion();
      contexto.aviso(mensaje);
      return true;
    } catch (error) {
      contexto.alerta(error.message);
      return false;
    }
  };

  const filasClientes = () => estado.clientes.map((cliente) => {
    const deuda = servicioClientes.deudaDeCliente(cliente);
    return {
      ...cliente,
      deudaTexto: aPesos(deuda),
      deudaHtml: deuda > 0 ? rellenar(documento.querySelector('#deuda-con-saldo').innerHTML, { valor: aPesos(deuda) }) : aPesos(0),
    };
  });

  const cuadriculaClientes = montarCuadricula(buscar('#cuadricula-clientes', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Clientes',
    vacio: 'Aún no hay clientes. Crea uno con "Nuevo cliente".',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '84px' },
      { clave: 'nombre', titulo: 'Nombre', ancho: 'minmax(0, 1.2fr)' },
      { clave: 'telefono', titulo: 'Teléfono', ancho: '130px' },
      { clave: 'correo', titulo: 'Correo', ancho: 'minmax(0, 1.2fr)' },
      { clave: 'deudaTexto', titulo: 'Deuda', ancho: '112px', alinear: 'derecha', html: (fila) => fila.deudaHtml },
      { clave: 'acciones', titulo: 'Acciones', ancho: '300px', filtrable: false, html: (fila) => repetir(documento, 'acciones-cliente', [{ id: fila.id }]) },
    ],
    filas: filasClientes(),
  });
  const pintarLista = () => cuadriculaClientes.actualizar(filasClientes());

  const abrirFormulario = (cliente) => {
    clienteEnEdicion = cliente?.id ?? null;
    buscar('#titulo-formulario-cliente', raiz).textContent = cliente ? `Editar a ${cliente.nombre}` : 'Nuevo cliente';
    campos.forEach((nombre) => { campo(nombre).value = cliente?.[nombre] ?? ''; });
    buscar('#formulario-cliente', raiz).hidden = false;
    campo('nombre').focus();
  };
  const cerrarFormulario = () => { buscar('#formulario-cliente', raiz).hidden = true; };

  buscar('#nuevo-cliente', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-cliente', raiz).onclick = cerrarFormulario;
  buscar('#guardar-cliente', raiz).onclick = () => {
    const datos = Object.fromEntries(campos.map((nombre) => [nombre, campo(nombre).value]));
    const editando = clienteEnEdicion !== null;
    const aplicado = ejecutar(
      () => (editando ? servicioClientes.actualizarCliente(clienteEnEdicion, datos) : servicioClientes.agregarCliente(datos)),
      editando ? 'Cliente actualizado correctamente' : 'Cliente agregado correctamente',
    );
    if (!aplicado) return;
    cerrarFormulario();
    pintarLista();
  };

  // Acciones de cada fila
  buscar('#cuadricula-clientes', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    const id = boton.dataset.editar ?? boton.dataset.eliminar ?? boton.dataset.historial;
    const cliente = servicioClientes.buscarCliente(id);
    if (boton.dataset.editar) abrirFormulario(cliente);
    else if (boton.dataset.eliminar) {
      clientePorEliminar = cliente.id;
      buscar('#texto-eliminar-cliente', raiz).textContent = `¿Eliminar a ${cliente.nombre}?`;
      buscar('#confirmar-eliminar-cliente', raiz).hidden = false;
      buscar('#eliminar-cliente-no', raiz).focus();
    } else {
      buscar('#titulo-historial', raiz).textContent = `Historial de ${cliente.nombre}`;
      montarCuadricula(buscar('#cuadricula-compras', raiz), {
        plantillas: plantillasCuadricula,
        titulo: `Compras de ${cliente.nombre}`,
        vacio: 'Este cliente aún no tiene ventas.',
        columnas: [
          { clave: 'id', titulo: 'N°', ancho: '84px' },
          { clave: 'fecha', titulo: 'Fecha', ancho: '140px' },
          { clave: 'productos', titulo: 'Productos', ancho: 'minmax(0, 2fr)' },
          { clave: 'metodo', titulo: 'Pago', ancho: '110px' },
          { clave: 'total', titulo: 'Total', ancho: '112px', alinear: 'derecha' },
        ],
        filas: servicioClientes.ventasDeCliente(cliente).slice().reverse().map((venta) => ({
          id: venta.id, fecha: aFecha(venta.fecha), productos: resumirItems(venta), metodo: venta.metodo, total: aPesos(venta.total),
        })),
      });
      buscar('#historial-cliente', raiz).hidden = false;
    }
  });

  buscar('#eliminar-cliente-no', raiz).onclick = () => { buscar('#confirmar-eliminar-cliente', raiz).hidden = true; };
  buscar('#eliminar-cliente-si', raiz).onclick = () => {
    ejecutar(() => servicioClientes.eliminarCliente(clientePorEliminar), 'Cliente eliminado correctamente');
    buscar('#confirmar-eliminar-cliente', raiz).hidden = true;
    pintarLista();
  };

  pintarLista();
}
