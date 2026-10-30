// Sesión del navegador. Si la persona elige "mantener la sesión", vive en localStorage; si no, en sessionStorage.
const CLAVE_SESION = 'generico.sesion';
const DURACION_MS = 8 * 60 * 60 * 1000;

function leer(almacen) {
  try {
    const datos = JSON.parse(almacen.getItem(CLAVE_SESION));
    return datos && datos.expira > Date.now() ? datos : null;
  } catch { return null; }
}

export function sesionActual() {
  try { return leer(sessionStorage) || leer(localStorage); } catch { return null; }
}

export function iniciarSesion(usuario, recordar) {
  const datos = { usuario: usuario.usuario, nombre: usuario.nombre, correo: usuario.correo, expira: Date.now() + DURACION_MS };
  try {
    sessionStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_SESION);
    (recordar ? localStorage : sessionStorage).setItem(CLAVE_SESION, JSON.stringify(datos));
  } catch { /* sin almacenamiento */ }
}

export function cerrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_SESION);
  } catch { /* sin almacenamiento */ }
  location.replace('index.html');
}

// Se llama al inicio de toda página protegida: devuelve la sesión o redirige al ingreso.
export function requerirSesion() {
  const sesion = sesionActual();
  if (!sesion) {
    const pagina = location.pathname.split('/').pop() || 'panel.html';
    location.replace('index.html?siguiente=' + encodeURIComponent(pagina));
    return null;
  }
  return sesion;
}
