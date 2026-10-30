import { buscar } from '../../core/dom.js';
import { aFecha } from '../../core/format.js';
import { cargarHtml, seccion } from '../../core/template.js';
import { registrosDeAuditoria } from '../../services/auditoria.service.js';
import { descargarCsv } from '../../services/csv.service.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';

let documento;
let plantillasCuadricula;

export async function dibujar() {
  documento = await cargarHtml(new URL('./auditoria.html', import.meta.url));
  plantillasCuadricula = await cargarPlantillasCuadricula();
  return seccion(documento, 'principal');
}

export function montar(raiz, contexto) {
  const cuadricula = montarCuadricula(buscar('#cuadricula-auditoria', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Registro de auditoría',
    vacio: 'Aún no hay registros de auditoría.',
    columnas: [
      { clave: 'id', titulo: 'N°', ancho: '84px' },
      { clave: 'fechaTexto', titulo: 'Fecha', ancho: '140px' },
      { clave: 'usuario', titulo: 'Persona', ancho: '140px' },
      { clave: 'modulo', titulo: 'Módulo', ancho: '110px' },
      { clave: 'accion', titulo: 'Acción', ancho: 'minmax(0, 1fr)' },
      { clave: 'detalle', titulo: 'Detalle', ancho: 'minmax(0, 2fr)' },
    ],
    // Desde Roles se llega con ?modulo=roles para ver solo los cambios de roles y permisos
    filtrosIniciales: { modulo: new URLSearchParams(location.search).get('modulo') ?? '' },
    filas: registrosDeAuditoria().map((registro) => ({ ...registro, fechaTexto: aFecha(registro.fecha) })),
  });

  buscar('#descargar-auditoria', raiz).onclick = () => {
    const registros = cuadricula.filtradas();
    if (!registros.length) return contexto.alerta('No hay registros para descargar');
    descargarCsv('auditoria.csv', ['N°', 'Fecha', 'Persona', 'Módulo', 'Acción', 'Detalle'],
      registros.map((registro) => [registro.id, registro.fechaTexto, registro.usuario, registro.modulo, registro.accion, registro.detalle]));
    contexto.aviso('Documento CSV descargado correctamente');
  };
}
