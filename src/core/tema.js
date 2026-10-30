import { preferencias } from './preferencias.js';
import { icono, ICONO_SOL, ICONO_LUNA } from './iconos.js';

const CLAVE_TEMA = 'generico.tema';

export const TEMA_AUTOMATICO = 'automatico';

export const leerTema = () => preferencias.leer(CLAVE_TEMA) || TEMA_AUTOMATICO;

export function iniciarTema() {
  const tema = preferencias.leer(CLAVE_TEMA);
  if (tema === 'claro' || tema === 'oscuro') document.documentElement.dataset.tema = tema;
}

// Aplica y guarda el tema: 'claro', 'oscuro' o 'automatico' (sigue al dispositivo)
export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro' || tema === 'oscuro') raiz.dataset.tema = tema;
  else {
    delete raiz.dataset.tema;
    tema = TEMA_AUTOMATICO;
  }
  preferencias.guardar(CLAVE_TEMA, tema);
  return tema;
}

// Cambia entre claro y oscuro y devuelve el tema aplicado
export function alternarTema() {
  const raiz = document.documentElement;
  const esOscuro = raiz.dataset.tema
    ? raiz.dataset.tema === 'oscuro'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  return aplicarTema(esOscuro ? 'claro' : 'oscuro');
}

// Botón de tema como icono: la luna se ve en modo claro y el sol en modo oscuro (lo decide el CSS)
export function prepararBotonTema(boton, alCambiar) {
  boton.innerHTML = icono(ICONO_LUNA, 'icono-luna') + icono(ICONO_SOL, 'icono-sol');
  boton.title = 'Cambiar entre modo claro y oscuro';
  boton.onclick = () => {
    const tema = alternarTema();
    if (alCambiar) alCambiar(tema);
  };
}
