import { buscar } from '../../core/dom.js';
import { cargarHtml, rellenar } from '../../core/template.js';
import { icono, ICONO_SALIR } from '../../core/iconos.js';
import { preferencias } from '../../core/preferencias.js';
import { cerrarSesion } from '../../core/sesion.js';
import { vistaActual } from '../../core/router.js';
import { MENU } from '../../config/nav.js';
import { puede } from '../../core/autorizacion.js';

const CLAVE_MENU = 'generico.menu-recogido';

export async function montarMenuLateral(ranura) {
  const documento = await cargarHtml(new URL('./sidebar.html', import.meta.url));
  ranura.innerHTML = documento.querySelector('aside').outerHTML;

  const menu = buscar('#menu-lateral');
  const plantillaEnlace = documento.querySelector('#opcion-enlace').innerHTML;
  const plantillaSalir = documento.querySelector('#opcion-salir').innerHTML;

  // Solo se muestran los módulos que el rol de la persona puede ver
  const visibles = MENU.filter((opcion) => puede(opcion.id, 'ver'));
  const enlaces = visibles.map((opcion, posicion) => {
    const abreGrupoInferior = opcion.abajo && !visibles[posicion - 1]?.abajo;
    const separador = abreGrupoInferior ? '<div class="separador-flexible"></div>' : '';
    return separador + rellenar(plantillaEnlace, {
      id: opcion.id,
      etiqueta: opcion.etiqueta,
      icono: icono(opcion.icono),
      clase: opcion.id === vistaActual() ? 'activa' : '',
    });
  });

  // "Cerrar sesión" es siempre la última opción del menú
  menu.innerHTML = enlaces.join('') + rellenar(plantillaSalir, { icono: icono(ICONO_SALIR) });
  buscar('.opcion-menu.activa', menu)?.setAttribute('aria-current', 'page');
  buscar('#cerrar-sesion', menu).onclick = cerrarSesion;

  const recogido = preferencias.leer(CLAVE_MENU);
  if (recogido === '1' || (recogido === null && innerWidth < 800)) menu.classList.add('recogido');
}

export const leerMenuRecogido = () => buscar('#menu-lateral').classList.contains('recogido');

export function establecerMenuRecogido(recogido) {
  buscar('#menu-lateral').classList.toggle('recogido', recogido);
  preferencias.guardar(CLAVE_MENU, recogido ? '1' : '0');
}

export function alternarMenuLateral() {
  establecerMenuRecogido(!leerMenuRecogido());
}
