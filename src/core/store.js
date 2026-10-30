import { semilla } from '../data/seed.js';

const CLAVE_DATOS = 'generico.tienda';

// Cada vista es una página distinta, así que los datos de prueba se guardan en el navegador entre páginas.
// Si lo guardado tiene otra estructura que la semilla, se parte de la semilla.
// Lo guardado antes de que existieran ajustes, roles o usuarios se completa con esas secciones de la semilla.
function completarConSemilla(guardado) {
  for (const clave of Object.keys(semilla)) guardado[clave] ??= structuredClone(semilla[clave]);
  return guardado;
}

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_DATOS));
    if (guardado?.version === semilla.version) return completarConSemilla(guardado);
  } catch { /* datos ilegibles */ }
  return structuredClone(semilla);
}

export const estado = cargar();

export function guardarEstado() {
  try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
}

addEventListener('pagehide', guardarEstado);
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') guardarEstado();
});
