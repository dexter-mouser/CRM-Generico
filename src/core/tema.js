import { preferencias } from './preferencias.js';
import { icono, ICONO_SOL, ICONO_LUNA } from './iconos.js';

const CLAVE_TEMA = 'generico.tema';

export function iniciarTema() {
  const tema = preferencias.leer(CLAVE_TEMA);
  if (tema) document.documentElement.dataset.tema = tema;
}

// Cambia entre claro y oscuro y devuelve el tema aplicado
export function alternarTema() {
  const raiz = document.documentElement;
  const esOscuro = raiz.dataset.tema
    ? raiz.dataset.tema === 'oscuro'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  raiz.dataset.tema = esOscuro ? 'claro' : 'oscuro';
  preferencias.guardar(CLAVE_TEMA, raiz.dataset.tema);
  return raiz.dataset.tema;
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
