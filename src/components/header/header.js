import { buscar, buscarTodos } from '../../core/dom.js';
import { cargarHtml, repetir } from '../../core/template.js';
import { icono, ICONO_HAMBURGUESA, ICONO_CAMPANA } from '../../core/iconos.js';
import { aFecha } from '../../core/format.js';
import { estado } from '../../core/store.js';
import { alertasDeCotizaciones } from '../../services/embudo.service.js';
import { tareasPendientes, estaVencidaTarea } from '../../services/actividades.service.js';
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

  montarAlertas(documento);
}

// Alertas del perfil de la sesión: cotizaciones vencidas sin motivo (de ese vendedor) y tareas vencidas o de hoy.
// La primera vez que se abre una página en la sesión se avisa también con un mensaje.
const CLAVE_ALERTAS_AVISADAS = 'generico.alertas-avisadas';
let plantillasEncabezado = null;

// Vuelve a calcular las alertas después de un cambio (registrar un motivo, completar una tarea)
export function refrescarAlertas() {
  if (plantillasEncabezado) pintarAlertas(plantillasEncabezado);
}

function montarAlertas(documento) {
  plantillasEncabezado = documento;
  const boton = buscar('#boton-alertas');
  const lista = buscar('#lista-alertas');
  boton.innerHTML = icono(ICONO_CAMPANA);
  boton.onclick = () => {
    lista.hidden = !lista.hidden;
    boton.setAttribute('aria-expanded', String(!lista.hidden));
  };
  document.addEventListener('click', (evento) => {
    if (!lista.hidden && !evento.target.closest('.contenedor-alertas')) {
      lista.hidden = true;
      boton.setAttribute('aria-expanded', 'false');
    }
  });
  const cotizaciones = pintarAlertas(documento);

  let avisadas = false;
  try { avisadas = sessionStorage.getItem(CLAVE_ALERTAS_AVISADAS) === '1'; } catch { /* sin almacenamiento */ }
  if (cotizaciones && !avisadas) {
    mostrarAviso(`Tienes ${cotizaciones} cotización(es) vencida(s): registra el motivo en el Embudo`, 'alerta');
    try { sessionStorage.setItem(CLAVE_ALERTAS_AVISADAS, '1'); } catch { /* sin almacenamiento */ }
  }
}

// Pinta el contador y la lista; devuelve cuántas cotizaciones vencidas hay
function pintarAlertas(documento) {
  const nombreCliente = (id) => estado.clientes.find((cliente) => cliente.id === id)?.nombre ?? id;
  const finDeHoy = new Date().setHours(23, 59, 59, 999);
  const cotizaciones = alertasDeCotizaciones().map((cotizacion) => ({
    enlace: `embudo.html?perdida=${encodeURIComponent(cotizacion.id)}`,
    titulo: `Cotización ${cotizacion.id} vencida sin motivo`,
    detalle: `${cotizacion.cliente} · venció el ${aFecha(cotizacion.vigenciaHasta.slice(0, 10))} · registra por qué se perdió`,
  }));
  const tareas = tareasPendientes().filter((tarea) => new Date(tarea.vence).getTime() <= finDeHoy).map((tarea) => ({
    enlace: `clientes.html?ficha=${encodeURIComponent(tarea.clienteId)}`,
    titulo: `${estaVencidaTarea(tarea) ? 'Tarea vencida' : 'Tarea para hoy'}: ${tarea.descripcion}`,
    detalle: `${nombreCliente(tarea.clienteId)} · ${tarea.responsable}`,
  }));
  const alertas = [...cotizaciones, ...tareas];

  const boton = buscar('#boton-alertas');
  const lista = buscar('#lista-alertas');
  const contador = buscar('#contador-alertas');
  contador.hidden = !alertas.length;
  contador.textContent = alertas.length;
  boton.setAttribute('aria-label', alertas.length ? `Alertas: ${alertas.length} pendiente(s)` : 'Alertas: ninguna');
  lista.innerHTML = alertas.length
    ? repetir(documento, 'alerta', alertas)
    : '<div class="texto-suave">No tienes alertas pendientes.</div>';
  return cotizaciones.length;
}
