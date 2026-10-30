// Cliente de la API (backend Spring Boot). La sesión viaja en una cookie HttpOnly, por eso se envían credenciales.
// Los endpoints que debe ofrecer el backend están en docs/api.md. Cada función de src/services/*.service.js
// que hoy lee y guarda en core/store.js se reemplaza por una llamada a estas funciones.
import { URL_API } from '../config/entorno.js';
import { cerrarSesion } from '../core/sesion.js';

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

async function solicitar(metodo, ruta, cuerpo) {
  let respuesta;
  try {
    respuesta = await fetch(URL_API + ruta, {
      method: metodo,
      credentials: 'include',
      headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 0);
  }
  if (respuesta.status === 401) {
    cerrarSesion();
    throw new ErrorApi('Tu sesión venció. Ingresa de nuevo.', 401);
  }
  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(datos?.mensaje ?? 'No se pudo completar la operación.', respuesta.status);
  return datos;
}

export const api = {
  obtener: (ruta) => solicitar('GET', ruta),
  crear: (ruta, cuerpo) => solicitar('POST', ruta, cuerpo),
  actualizar: (ruta, cuerpo) => solicitar('PUT', ruta, cuerpo),
  eliminar: (ruta) => solicitar('DELETE', ruta),
};
