import { buscar } from '../../core/dom.js';
import { aFecha } from '../../core/format.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { registrosDeAuditoria } from '../../services/auditoria.service.js';
import { descargarCsv } from '../../services/csv.service.js';

const MAXIMO_FILAS = 200;
let documento;

const sinTildes = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function dibujar() {
  documento = await cargarHtml(new URL('./auditoria.html', import.meta.url));
  const modulos = [...new Set(registrosDeAuditoria().map((registro) => registro.modulo))].sort();
  return seccion(documento, 'principal', { opcionesModulo: repetir(documento, 'opcion-modulo', modulos.map((modulo) => ({ modulo }))) });
}

export function montar(raiz, contexto) {
  const filtrados = () => {
    const modulo = buscar('#filtro-modulo', raiz).value;
    const texto = sinTildes(buscar('#filtro-texto', raiz).value.trim());
    return registrosDeAuditoria().filter((registro) =>
      (!modulo || registro.modulo === modulo)
      && (!texto || sinTildes([registro.usuario, registro.accion, registro.detalle, registro.modulo].join(' ')).includes(texto)));
  };

  const pintar = () => {
    const registros = filtrados();
    buscar('#filas-auditoria', raiz).innerHTML = repetir(documento, 'fila-auditoria',
      registros.slice(0, MAXIMO_FILAS).map((registro) => ({ ...registro, fecha: aFecha(registro.fecha) })));
    buscar('#resumen-auditoria', raiz).textContent = registros.length
      ? `Mostrando ${Math.min(registros.length, MAXIMO_FILAS)} de ${registros.length} registro(s), del más reciente al más antiguo.`
      : 'No hay registros con ese filtro.';
  };

  buscar('#filtro-modulo', raiz).onchange = pintar;
  buscar('#filtro-texto', raiz).oninput = pintar;
  buscar('#descargar-auditoria', raiz).onclick = () => {
    const registros = filtrados();
    if (!registros.length) return contexto.alerta('No hay registros para descargar');
    descargarCsv('auditoria.csv', ['N°', 'Fecha', 'Persona', 'Módulo', 'Acción', 'Detalle'],
      registros.map((registro) => [registro.id, aFecha(registro.fecha), registro.usuario, registro.modulo, registro.accion, registro.detalle]));
    contexto.aviso('Documento CSV descargado correctamente');
  };
  pintar();
}
