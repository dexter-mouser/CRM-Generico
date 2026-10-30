// Arranque de todas las páginas protegidas (todas menos index.html): verifica la sesión y monta el menú.
import { buscar } from './core/dom.js';
import { iniciarTema } from './core/tema.js';
import { requerirSesion } from './core/sesion.js';
import { iniciar } from './core/router.js';
import { montarEncabezado } from './components/header/header.js';
import { montarMenuLateral, alternarMenuLateral } from './components/sidebar/sidebar.js';

iniciarTema();
const sesion = requerirSesion();
if (sesion) {
  await Promise.all([
    montarMenuLateral(buscar('#ranura-menu')),
    montarEncabezado(buscar('#ranura-encabezado'), { alAlternarMenu: alternarMenuLateral, sesion }),
  ]);
  iniciar();
}
