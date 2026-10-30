import { buscar, buscarTodos } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, aFecha } from '../../core/format.js';
import { cargarHtml, seccion, repetir, rellenar } from '../../core/template.js';
import { resumirItems } from '../../services/ventas.service.js';
import * as servicioClientes from '../../services/clientes.service.js';

let documento;
let filtro = '';

export async function dibujar() {
  documento = await cargarHtml(new URL('./clientes.html', import.meta.url));
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

  const pintarLista = () => {
    const clientes = servicioClientes.buscarClientes(filtro);
    buscar('#lista-clientes', raiz).innerHTML = repetir(documento, 'fila-cliente', clientes.map((cliente) => {
      const deuda = servicioClientes.deudaDeCliente(cliente);
      return {
        ...cliente,
        deuda: deuda > 0
          ? rellenar(documento.querySelector('#deuda-con-saldo').innerHTML, { valor: aPesos(deuda) })
          : aPesos(0),
      };
    }));
    buscar('#sin-clientes', raiz).hidden = clientes.length > 0;
  };

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

  buscar('#buscar-cliente', raiz).value = filtro;
  buscar('#buscar-cliente', raiz).oninput = (evento) => {
    filtro = evento.target.value;
    pintarLista();
  };

  // Acciones de cada fila
  buscar('#lista-clientes', raiz).addEventListener('click', (evento) => {
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
      const compras = servicioClientes.ventasDeCliente(cliente);
      buscar('#titulo-historial', raiz).textContent = `Historial de ${cliente.nombre}`;
      buscar('#compras-cliente', raiz).innerHTML = repetir(documento, 'fila-compra', compras.slice().reverse().map((venta) => ({
        id: venta.id, fecha: aFecha(venta.fecha), productos: resumirItems(venta), metodo: venta.metodo, total: aPesos(venta.total),
      })));
      buscar('#sin-compras', raiz).hidden = compras.length > 0;
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
