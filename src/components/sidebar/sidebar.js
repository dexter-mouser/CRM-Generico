// Menú lateral: los 6 grupos siempre a la vista. El grupo de la página abierta muestra sus secciones debajo.
// En el celular el menú pasa a una barra inferior con los mismos grupos (las secciones quedan como pestañas).
import { buscar } from '../../core/dom.js';
import { cargarHtml, rellenar } from '../../core/template.js';
import { icono, ICONO_SALIR } from '../../core/iconos.js';
import { preferencias } from '../../core/preferencias.js';
import { cerrarSesion } from '../../core/sesion.js';
import { vistaActual, seccionActual } from '../../core/router.js';
import { GRUPOS, enlaceDeSeccion } from '../../config/nav.js';
import { puede } from '../../core/autorizacion.js';

const CLAVE_MENU = 'generico.menu-recogido';

// Secciones de un grupo que la persona puede ver
export const seccionesVisibles = (grupo) => grupo.secciones.filter((seccion) => puede(seccion.modulo, 'ver'));

// Grupos con al menos una sección visible para la persona
export const gruposVisibles = () => GRUPOS.map((grupo) => ({ ...grupo, secciones: seccionesVisibles(grupo) })).filter((grupo) => grupo.secciones.length);

// La sección de la página abierta: mismo módulo y, si la página se divide, la misma parte
export const esSeccionActual = (seccion) => seccion.modulo === vistaActual() && (!seccion.seccion || seccion.seccion === seccionActual());

export async function montarMenuLateral(ranura) {
  const documento = await cargarHtml(new URL('./sidebar.html', import.meta.url));
  ranura.innerHTML = documento.querySelector('aside').outerHTML;

  const menu = buscar('#menu-lateral');
  const plantillaGrupo = documento.querySelector('#grupo-enlace').innerHTML;
  const plantillaSeccion = documento.querySelector('#seccion-enlace').innerHTML;
  const plantillaSalir = documento.querySelector('#opcion-salir').innerHTML;

  const grupos = gruposVisibles();
  const partes = grupos.map((grupo, posicion) => {
    const abierto = grupo.secciones.some(esSeccionActual);
    const abreGrupoInferior = grupo.abajo && !grupos[posicion - 1]?.abajo;
    const enlace = rellenar(plantillaGrupo, {
      id: grupo.id,
      etiqueta: grupo.etiqueta,
      corta: grupo.corta ?? grupo.etiqueta,
      icono: icono(grupo.icono),
      enlace: enlaceDeSeccion(grupo.secciones[0]),
      clase: abierto ? 'activa' : '',
      cuenta: abierto ? '' : grupo.secciones.length,
    });
    const secciones = abierto
      ? `<div class="secciones-grupo">${grupo.secciones.map((seccion) => rellenar(plantillaSeccion, {
        etiqueta: seccion.etiqueta,
        enlace: enlaceDeSeccion(seccion),
        clase: esSeccionActual(seccion) ? 'activa' : '',
      })).join('')}</div>`
      : '';
    return (abreGrupoInferior ? '<div class="separador-flexible"></div>' : '') + enlace + secciones;
  });

  // "Cerrar sesión" es siempre la última opción del menú
  menu.innerHTML = partes.join('') + rellenar(plantillaSalir, { icono: icono(ICONO_SALIR) });
  buscar('.opcion-menu.activa', menu)?.setAttribute('aria-current', 'true');
  buscar('.opcion-seccion.activa', menu)?.setAttribute('aria-current', 'page');
  buscar('#cerrar-sesion', menu).onclick = () => cerrarSesion();

  if (preferencias.leer(CLAVE_MENU) === '1') menu.classList.add('recogido');
}

export const leerMenuRecogido = () => buscar('#menu-lateral').classList.contains('recogido');

export function establecerMenuRecogido(recogido) {
  buscar('#menu-lateral').classList.toggle('recogido', recogido);
  preferencias.guardar(CLAVE_MENU, recogido ? '1' : '0');
}

export function alternarMenuLateral() {
  establecerMenuRecogido(!leerMenuRecogido());
}
