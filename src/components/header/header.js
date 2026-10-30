import { buscar, buscarTodos } from '../../core/dom.js';
import { cargarHtml } from '../../core/template.js';
import { icono, ICONO_HAMBURGUESA } from '../../core/iconos.js';
import { prepararBotonTema } from '../../core/tema.js';
import { vistaActual } from '../../core/router.js';
import { mostrarAviso } from '../toast/toast.js';
import { logoCompleto } from '../logo/logo.js';

export async function montarEncabezado(ranura, { alAlternarMenu, sesion }) {
  const documento = await cargarHtml(new URL('./header.html', import.meta.url));
  ranura.innerHTML = documento.querySelector('header').outerHTML;

  buscar('#alternar-menu').innerHTML = icono(ICONO_HAMBURGUESA);
  buscar('#alternar-menu').onclick = alAlternarMenu;
  prepararBotonTema(buscar('#alternar-tema'), (tema) => mostrarAviso(`Tema ${tema} aplicado correctamente`));
  buscar('.marca').innerHTML = logoCompleto(32);

  const iniciales = sesion.nombre.split(' ').slice(0, 2).map((palabra) => palabra[0]).join('').toUpperCase();
  const avatar = buscar('#usuario');
  avatar.textContent = iniciales;
  avatar.title = sesion.nombre;
  avatar.setAttribute('aria-label', `Usuario: ${sesion.nombre}`);

  buscarTodos('.pestana-superior[data-vista]').forEach((enlace) =>
    enlace.classList.toggle('activa', enlace.dataset.vista === vistaActual()));
}
