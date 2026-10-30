import { aPesos } from './format.js';

const FORMATOS = {
  pesos: aPesos,
  porcentaje: (valor) => Math.round(valor) + '% de la meta',
  numero: (valor) => String(Math.round(valor)),
};

// Contadores de 0 al valor y barras de 0 al porcentaje. Con ejecutar=false se muestran directo.
export function animar(raiz, ejecutar = true) {
  const sinMovimiento = !ejecutar || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duracion = sinMovimiento ? 0 : 900;

  raiz.querySelectorAll('[data-hasta]').forEach((elemento) => {
    const hasta = Number(elemento.dataset.hasta);
    const formato = FORMATOS[elemento.dataset.formato] || FORMATOS.numero;
    const inicio = performance.now();

    (function paso(ahora) {
      const avance = duracion ? Math.min(1, (ahora - inicio) / duracion) : 1;
      elemento.textContent = formato(hasta * (1 - Math.pow(1 - avance, 3)));
      if (avance < 1) requestAnimationFrame(paso);
    })(inicio);
  });

  raiz.querySelectorAll('[data-porcentaje]').forEach((barra) => {
    if (sinMovimiento) barra.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => (barra.style.width = barra.dataset.porcentaje + '%')));
  });
}
