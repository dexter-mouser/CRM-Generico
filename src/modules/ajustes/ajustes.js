import { buscar, buscarTodos } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { leerTema, aplicarTema } from '../../core/tema.js';
import { leerMenuRecogido, establecerMenuRecogido } from '../../components/sidebar/sidebar.js';
import { mostrarRecibo } from '../../components/recibo/recibo.js';
import * as servicioAjustes from '../../services/ajustes.service.js';

export async function dibujar() {
  const documento = await cargarHtml(new URL('./ajustes.html', import.meta.url));
  const { tienda, recibo } = estado.ajustes;
  return seccion(documento, 'principal', {
    ...tienda,
    pie: recibo.pie,
    metodos: repetir(documento, 'casilla-metodo', servicioAjustes.METODOS_DISPONIBLES.map((metodo) => ({ metodo }))),
  });
}

// Recibo de ejemplo: usa los ajustes guardados con una venta inventada
const ventaDeEjemplo = () => ({
  fecha: new Date().toISOString(),
  cliente: 'Cliente de ejemplo',
  metodo: estado.ajustes.ventas.metodosPago[0],
  total: 37000,
  items: [
    { nombre: 'Producto de ejemplo A', cantidad: 2, valorUnitario: 12500 },
    { nombre: 'Producto de ejemplo B', cantidad: 1, valorUnitario: 12000 },
  ],
});

export function montar(raiz, contexto) {
  const valorDe = (selector) => buscar(selector, raiz).value;

  // Ejecuta un cambio y muestra el aviso; devuelve si se pudo aplicar
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

  // Apariencia
  const pintarSegmentos = () => {
    const menu = leerMenuRecogido() ? 'recogido' : 'abierto';
    buscarTodos('[data-opcion-tema]', raiz).forEach((boton) =>
      boton.setAttribute('aria-pressed', String(boton.dataset.opcionTema === leerTema())));
    buscarTodos('[data-opcion-menu]', raiz).forEach((boton) =>
      boton.setAttribute('aria-pressed', String(boton.dataset.opcionMenu === menu)));
  };

  buscarTodos('[data-opcion-tema]', raiz).forEach((boton) => {
    boton.onclick = () => {
      aplicarTema(boton.dataset.opcionTema);
      pintarSegmentos();
      contexto.aviso(`Tema ${boton.textContent.trim().toLowerCase()} aplicado correctamente`);
    };
  });

  buscarTodos('[data-opcion-menu]', raiz).forEach((boton) => {
    boton.onclick = () => {
      establecerMenuRecogido(boton.dataset.opcionMenu === 'recogido');
      pintarSegmentos();
      contexto.aviso(`Menú lateral ${boton.textContent.trim().toLowerCase()} aplicado correctamente`);
    };
  });
  pintarSegmentos();

  // Tienda
  buscar('#guardar-tienda', raiz).onclick = () => {
    ejecutar(() => servicioAjustes.guardarDatosTienda({
      nombre: valorDe('#tienda-nombre'),
      nit: valorDe('#tienda-nit'),
      telefono: valorDe('#tienda-telefono'),
      ciudad: valorDe('#tienda-ciudad'),
      direccion: valorDe('#tienda-direccion'),
    }), 'Datos de la tienda guardados correctamente');
  };

  // Ventas: los cambios se aplican al marcar o desmarcar
  buscarTodos('[data-metodo]', raiz).forEach((casilla) => {
    casilla.checked = estado.ajustes.ventas.metodosPago.includes(casilla.dataset.metodo);
    casilla.onchange = () => {
      const aplicado = ejecutar(
        () => servicioAjustes.establecerMetodoPago(casilla.dataset.metodo, casilla.checked),
        'Métodos de pago actualizados correctamente',
      );
      if (!aplicado) casilla.checked = !casilla.checked;
    };
  });

  const permitirSinExistencias = buscar('#permitir-sin-existencias', raiz);
  permitirSinExistencias.checked = estado.ajustes.ventas.permitirSinExistencias;
  permitirSinExistencias.onchange = () => ejecutar(
    () => servicioAjustes.establecerPermitirSinExistencias(permitirSinExistencias.checked),
    permitirSinExistencias.checked
      ? 'Ahora se puede vender sin existencias, aplicado correctamente'
      : 'Ya no se puede vender sin existencias, aplicado correctamente',
  );

  // Recibo
  const mostrarDatos = buscar('#mostrar-datos-tienda', raiz);
  mostrarDatos.checked = estado.ajustes.recibo.mostrarDatosTienda;
  mostrarDatos.onchange = () => ejecutar(
    () => servicioAjustes.establecerMostrarDatosTienda(mostrarDatos.checked),
    'Datos de la tienda en el recibo actualizados correctamente',
  );

  buscar('#guardar-recibo', raiz).onclick = () => {
    ejecutar(() => servicioAjustes.guardarMensajeRecibo(valorDe('#recibo-pie')), 'Mensaje del recibo guardado correctamente');
  };
  buscar('#ver-recibo-ejemplo', raiz).onclick = () => mostrarRecibo(ventaDeEjemplo());

  // Datos de prueba: pide confirmación antes de borrar
  const confirmacion = buscar('#confirmar-restablecer', raiz);
  buscar('#restablecer', raiz).onclick = () => {
    confirmacion.hidden = false;
    buscar('#confirmar-restablecer-no', raiz).focus();
  };
  buscar('#confirmar-restablecer-no', raiz).onclick = () => {
    confirmacion.hidden = true;
    buscar('#restablecer', raiz).focus();
  };
  buscar('#confirmar-restablecer-si', raiz).onclick = () => {
    confirmacion.hidden = true;
    ejecutar(servicioAjustes.restablecerDatosDePrueba, 'Datos de prueba restablecidos correctamente');
  };
}
