import { buscar } from './dom.js';
import { animar } from './animate.js';
import { activarCamposNumericos } from './numeros.js';
import { MENU } from '../config/nav.js';
import { rutas } from '../config/routes.js';
import { mostrarAviso } from '../components/toast/toast.js';

const ESQUELETO = '<div class="tarjetas">' + '<div class="esqueleto"></div>'.repeat(4) + '</div>'
  + '<div class="dos-columnas"><div class="esqueleto alto"></div><div class="esqueleto alto"></div></div>';
let turno = 0;

// Cada página HTML declara su vista en <body data-vista="...">
export const vistaActual = () => document.body.dataset.vista || 'panel';

// Cada módulo exporta dibujar(contexto) -> HTML y, opcionalmente, montar(raiz, contexto)
async function mostrar(conEsqueleto) {
  const id = vistaActual(), miTurno = ++turno, raiz = buscar('#vista');
  try {
    if (conEsqueleto) {
      raiz.innerHTML = ESQUELETO;
      await new Promise((resolver) => setTimeout(resolver, 450));
    }
    const modulo = await (rutas[id] || rutas.placeholder)();
    const opcion = MENU.find((elemento) => elemento.id === id) || { etiqueta: id };
    const contexto = {
      id,
      etiqueta: opcion.etiqueta,
      redibujar: () => mostrar(false),
      aviso: (texto) => mostrarAviso(texto, 'exito'),
      alerta: (texto) => mostrarAviso(texto, 'alerta'),
    };
    const html = await modulo.dibujar(contexto);
    if (miTurno !== turno) return;
    raiz.innerHTML = `<div class="vista${conEsqueleto ? '' : ' sin-animacion'}">${html}</div>`;
    animar(raiz, conEsqueleto);
    activarCamposNumericos(raiz);
    modulo.montar?.(raiz, contexto);
  } catch (error) {
    raiz.innerHTML = '<div class="caja"><div class="texto-suave">No se pudo cargar esta pantalla. Si abriste el archivo directamente, usa un servidor local (ver README).</div></div>';
    console.error(error);
  }
}

export function iniciar() { mostrar(true); }
