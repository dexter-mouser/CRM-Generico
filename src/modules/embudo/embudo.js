import { buscar } from '../../core/dom.js';
import { aPesos, aFecha } from '../../core/format.js';
import { puede } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { resumirItems, buscarDocumento } from '../../services/ventas.service.js';
import * as servicioEmbudo from '../../services/embudo.service.js';
import { mostrarReciboDeVenta } from '../../components/recibo/comprobantes.js';
import { refrescarAlertas } from '../../components/header/header.js';

let documento;

export async function dibujar() {
  documento = await cargarHtml(new URL('./embudo.html', import.meta.url));
  return seccion(documento, 'principal', {
    opcionesMotivo: repetir(documento, 'opcion', servicioEmbudo.MOTIVOS_PERDIDA.map((valor) => ({ valor }))),
  });
}

export function montar(raiz, contexto) {
  const puedeEditar = puede('embudo', 'editar');
  const puedeConvertir = puede('nueva-venta', 'crear');
  let enPerdida = null;
  buscar('#nueva-cotizacion', raiz).hidden = !puedeConvertir;

  const tarjeta = (cotizacion) => {
    const etapa = servicioEmbudo.etapaDe(cotizacion);
    const vencida = servicioEmbudo.estaVencida(cotizacion);
    const abierta = etapa === 'enviada' || etapa === 'negociacion';
    let acciones = repetir(documento, 'acciones-cerrada', [{ id: cotizacion.id }]);
    if (abierta && puedeEditar) {
      acciones = repetir(documento, 'acciones-abierta', [{
        id: cotizacion.id,
        negociar: etapa === 'enviada' ? repetir(documento, 'boton-negociar', [{ id: cotizacion.id }]) : '',
      }]);
      // Sin permiso para registrar ventas no se ofrece facturar ni remisionar
      if (!puedeConvertir) acciones = acciones.replace(/<a class="boton[^"]*" href="nueva-venta[^>]*>[^<]*<\/a>/g, '');
    }
    let motivo = '';
    if (etapa === 'perdida') motivo = `${cotizacion.motivoPerdida ?? 'Anulada'}${cotizacion.detallePerdida ? `: ${cotizacion.detallePerdida}` : ''}`;
    if (etapa === 'ganada') motivo = `Pasada a ${cotizacion.convertidoEn}`;
    return repetir(documento, 'tarjeta-oportunidad', [{
      id: cotizacion.id,
      total: aPesos(cotizacion.total),
      cliente: cotizacion.cliente,
      enlaceCliente: cotizacion.clienteId ? `clientes.html?ficha=${cotizacion.clienteId}` : 'clientes.html',
      productos: resumirItems(cotizacion),
      usuario: cotizacion.usuario,
      vigencia: vencida ? `Vencida el ${aFecha(cotizacion.vigenciaHasta.slice(0, 10))}` : `Válida hasta ${aFecha(cotizacion.vigenciaHasta.slice(0, 10))}`,
      clase: vencida ? 'vencida' : '',
      motivo: motivo ? repetir(documento, 'motivo-tarjeta', [{ texto: motivo }]) : '',
      acciones,
    }]);
  };

  const pintar = () => {
    const lista = servicioEmbudo.cotizaciones().slice().reverse();
    const resumen = servicioEmbudo.resumenDelEmbudo(lista);
    const abiertas = resumen.porEtapa.enviada.valor + resumen.porEtapa.negociacion.valor;
    buscar('#resumen-embudo', raiz).innerHTML = repetir(documento, 'indicador', [
      { etiqueta: 'Valor en juego (abiertas)', valor: aPesos(abiertas) },
      { etiqueta: 'Ganadas', valor: `${resumen.porEtapa.ganada.cantidad} · ${aPesos(resumen.porEtapa.ganada.valor)}` },
      { etiqueta: 'Perdidas', valor: `${resumen.porEtapa.perdida.cantidad} · ${aPesos(resumen.porEtapa.perdida.valor)}` },
      { etiqueta: 'Conversión', valor: `${resumen.conversion} %` },
    ]);
    buscar('#tablero', raiz).innerHTML = servicioEmbudo.ETAPAS.map((etapa) => {
      const deEtapa = lista.filter((cotizacion) => servicioEmbudo.etapaDe(cotizacion) === etapa.id);
      return repetir(documento, 'columna-embudo', [{
        etapa: etapa.id,
        titulo: etapa.etiqueta,
        cantidad: deEtapa.length,
        valor: aPesos(resumen.porEtapa[etapa.id].valor),
        tarjetas: deEtapa.map(tarjeta).join(''),
        vacio: deEtapa.length ? '' : repetir(documento, 'columna-vacia', [{}]),
      }]);
    }).join('');

    const alertas = servicioEmbudo.alertasDeCotizaciones();
    buscar('#alertas-embudo', raiz).hidden = !alertas.length;
    buscar('#titulo-alertas', raiz).textContent = `${alertas.length} cotización(es) vencida(s) sin motivo: ${alertas.map((cotizacion) => cotizacion.id).join(', ')}`;
  };

  const ejecutar = (accion, mensaje) => {
    try {
      accion();
      contexto.aviso(mensaje);
      pintar();
      refrescarAlertas();
      return true;
    } catch (error) {
      contexto.alerta(error.message);
      return false;
    }
  };

  const abrirPerdida = (id) => {
    enPerdida = id;
    buscar('#titulo-perdida', raiz).textContent = `¿Por qué se perdió la cotización ${id}?`;
    buscar('#detalle-perdida', raiz).value = '';
    const panel = buscar('#panel-perdida', raiz);
    panel.hidden = false;
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    buscar('#motivo-perdida', raiz).focus();
  };

  buscar('#tablero', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    if (boton.dataset.ver) mostrarReciboDeVenta(buscarDocumento(boton.dataset.ver));
    else if (boton.dataset.negociar) ejecutar(() => servicioEmbudo.cambiarEtapa(boton.dataset.negociar, 'negociacion'), `Cotización ${boton.dataset.negociar} en negociación correctamente`);
    else if (boton.dataset.perder) abrirPerdida(boton.dataset.perder);
  });

  buscar('#cancelar-perdida', raiz).onclick = () => { buscar('#panel-perdida', raiz).hidden = true; };
  buscar('#confirmar-perdida', raiz).onclick = () => {
    const aplicado = ejecutar(
      () => servicioEmbudo.marcarPerdida(enPerdida, buscar('#motivo-perdida', raiz).value, buscar('#detalle-perdida', raiz).value),
      `Cotización ${enPerdida} registrada como perdida correctamente`,
    );
    if (aplicado) buscar('#panel-perdida', raiz).hidden = true;
  };

  pintar();
  // Llega desde la alerta del encabezado con ?perdida=C17 para registrar el motivo directamente
  const pedida = new URLSearchParams(location.search).get('perdida');
  if (pedida && puedeEditar) abrirPerdida(pedida);
}
