import { buscar, buscarTodos } from '../../core/dom.js';
import { cargarHtml, seccion } from '../../core/template.js';
import { logoCompleto } from '../../components/logo/logo.js';
import { iniciarSesion } from '../../core/sesion.js';
import { icono, ICONO_OJO, ICONO_OJO_TACHADO } from '../../core/iconos.js';
import { USUARIOS } from '../../config/acceso.js';
import { MENU } from '../../config/nav.js';

export async function dibujar() {
  const documento = await cargarHtml(new URL('./acceso.html', import.meta.url));
  return seccion(documento, 'principal', { logo: logoCompleto(40) });
}

// Solo se vuelve a páginas propias del menú: evita redirecciones a sitios externos.
export function destinoSeguro() {
  const pedido = new URLSearchParams(location.search).get('siguiente');
  return MENU.some((opcion) => `${opcion.id}.html` === pedido) ? pedido : 'panel.html';
}

export function montar(raiz) {
  const error = buscar('#error', raiz);
  const recordar = buscar('#recordar', raiz);
  const formularios = { correo: buscar('#f-correo', raiz), clave: buscar('#f-clave', raiz) };
  const botones = buscarTodos('[data-pestana]', raiz);

  const elegir = (nombre) => {
    botones.forEach((boton) => boton.setAttribute('aria-pressed', String(boton.dataset.pestana === nombre)));
    for (const [clave, formulario] of Object.entries(formularios)) formulario.hidden = clave !== nombre;
    error.textContent = '';
    buscar('input', formularios[nombre]).focus();
  };
  const fallar = (texto, campo) => {
    error.textContent = texto;
    campo.focus();
  };
  const entrar = (usuario) => {
    iniciarSesion(usuario, recordar.checked);
    location.replace(destinoSeguro());
  };

  botones.forEach((boton) => (boton.onclick = () => elegir(boton.dataset.pestana)));

  formularios.correo.onsubmit = (evento) => {
    evento.preventDefault();
    const campo = buscar('#correo', raiz);
    const correo = campo.value.trim().toLowerCase();
    if (!correo) return fallar('Escribe tu correo.', campo);
    const usuario = USUARIOS.find((candidato) => candidato.correo === correo);
    usuario ? entrar(usuario) : fallar('Ese correo no está autorizado. Pide acceso al dueño de la tienda.', campo);
  };

  formularios.clave.onsubmit = (evento) => {
    evento.preventDefault();
    const campoUsuario = buscar('#usuario', raiz), campoClave = buscar('#clave', raiz);
    if (!campoUsuario.value.trim() || !campoClave.value) return fallar('Escribe tu usuario y tu clave.', campoUsuario);
    const usuario = USUARIOS.find((candidato) =>
      candidato.usuario === campoUsuario.value.trim() && candidato.clave === campoClave.value);
    usuario ? entrar(usuario) : fallar('Usuario o clave incorrectos. Revisa los datos e inténtalo de nuevo.', campoClave);
  };

  // El botón de la clave es un icono: ojo para mostrar y ojo tachado para ocultar
  const botonVer = buscar('#ver', raiz);
  const pintarOjo = (visible) => {
    botonVer.innerHTML = icono(visible ? ICONO_OJO_TACHADO : ICONO_OJO);
    botonVer.setAttribute('aria-label', visible ? 'Ocultar la clave' : 'Mostrar la clave');
    botonVer.setAttribute('aria-pressed', String(visible));
  };
  pintarOjo(false);
  botonVer.onclick = () => {
    const campo = buscar('#clave', raiz);
    const visible = campo.type === 'password';
    campo.type = visible ? 'text' : 'password';
    pintarOjo(visible);
  };
}
