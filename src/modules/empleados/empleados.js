import { buscar, buscarTodos } from '../../core/dom.js';
import { estado } from '../../core/store.js';
import { aPesos, fechaDeHoy } from '../../core/format.js';
import { leerEntero } from '../../core/numeros.js';
import { puede } from '../../core/autorizacion.js';
import { cargarHtml, seccion, repetir } from '../../core/template.js';
import { TIPOS_DOCUMENTO } from '../../core/validacion.js';
import { nombreDeTienda, enTiendaActiva } from '../../core/tienda.js';
import * as servicioEmpleados from '../../services/empleados.service.js';
import { cargarPlantillasCuadricula, montarCuadricula } from '../../components/cuadricula-datos/cuadricula-datos.js';
import { cargarPlantillasFicha, crearFicha } from '../../components/ficha-registro/ficha-registro.js';

const CAMPOS = ['nombre', 'tipoDocumento', 'documento', 'cargo', 'tiendaId', 'fechaIngreso', 'telefono', 'correo', 'turno', 'metaMensual', 'comision', 'usuarioId'];
let documento;
let plantillasCuadricula;
let plantillasFicha;

// Los empleados de la tienda activa (o de todas)
const empleadosDeLaVista = () => estado.empleados.filter(enTiendaActiva);

export async function dibujar() {
  documento = await cargarHtml(new URL('./empleados.html', import.meta.url));
  [plantillasCuadricula, plantillasFicha] = await Promise.all([cargarPlantillasCuadricula(), cargarPlantillasFicha()]);
  const activos = empleadosDeLaVista().filter((empleado) => empleado.activo);
  const desempeno = activos.map(servicioEmpleados.desempenoDelMes);
  const resumen = [
    { etiqueta: 'Empleados activos', valor: activos.length, detalle: `${empleadosDeLaVista().length - activos.length} retirados` },
    { etiqueta: 'Ventas del mes', valor: aPesos(desempeno.reduce((suma, uno) => suma + uno.total, 0)), detalle: 'Hechas por el equipo con su usuario' },
    { etiqueta: 'Comisiones estimadas', valor: aPesos(desempeno.reduce((suma, uno) => suma + uno.comision, 0)), detalle: 'Según el % de cada persona' },
  ];
  return seccion(documento, 'principal', {
    resumen: repetir(documento, 'tarjeta', resumen),
    opcionesDocumento: repetir(documento, 'opcion', Object.entries(TIPOS_DOCUMENTO).map(([valor, texto]) => ({ valor, texto }))),
    opcionesCargo: repetir(documento, 'opcion', servicioEmpleados.CARGOS.map((cargo) => ({ valor: cargo, texto: '' }))),
    opcionesTienda: repetir(documento, 'opcion', estado.tiendas.filter((tienda) => tienda.activa).map((tienda) => ({ valor: tienda.id, texto: tienda.nombre }))),
    opcionesUsuario: repetir(documento, 'opcion', [{ valor: '', texto: 'Sin usuario' }, ...estado.usuarios.map((usuario) => ({ valor: usuario.id, texto: `${usuario.nombre} · ${usuario.correo}` }))]),
    casillasTiendas: repetir(documento, 'casilla-tienda', estado.tiendas),
  });
}

export function montar(raiz, contexto) {
  const campo = (nombre) => buscar(`#empleado-${nombre}`, raiz);
  const formulario = buscar('#formulario-empleado', raiz);
  const casillas = buscarTodos('[data-tienda-acceso]', raiz);
  let enEdicion = null;
  let porRetirar = null;
  buscar('#nuevo-empleado', raiz).hidden = !puede('empleados', 'crear');

  const ejecutar = (accion, mensaje) => {
    try {
      accion();
      contexto.aviso(mensaje);
      contexto.redibujar();
    } catch (error) {
      contexto.alerta(error.message);
    }
  };

  // Las casillas de acceso solo aplican si el empleado tiene usuario; usuario.tiendas vacío = todas
  const mostrarAcceso = () => {
    const usuario = estado.usuarios.find((candidato) => candidato.id === campo('usuarioId').value);
    buscar('#acceso-tiendas', raiz).hidden = !usuario;
    if (!usuario) return;
    const permitidas = usuario.tiendas?.length ? usuario.tiendas : estado.tiendas.map((tienda) => tienda.id);
    casillas.forEach((casilla) => { casilla.checked = permitidas.includes(casilla.value); });
  };
  campo('usuarioId').onchange = mostrarAcceso;

  const abrirFormulario = (empleado) => {
    enEdicion = empleado?.id ?? null;
    buscar('#titulo-formulario-empleado', raiz).textContent = empleado ? `Editar a ${empleado.nombre}` : 'Nuevo empleado';
    const valores = empleado ?? { tipoDocumento: 'CC', fechaIngreso: fechaDeHoy(), tiendaId: campo('tiendaId').options[0]?.value ?? '', metaMensual: '', comision: '' };
    CAMPOS.forEach((nombre) => { campo(nombre).value = valores[nombre] ?? ''; });
    if (empleado && !empleado.metaMensual) campo('metaMensual').value = '';
    mostrarAcceso();
    formulario.hidden = false;
    formulario.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    campo('nombre').focus();
  };
  buscar('#nuevo-empleado', raiz).onclick = () => abrirFormulario(null);
  buscar('#cancelar-empleado', raiz).onclick = () => { formulario.hidden = true; };
  buscar('#guardar-empleado', raiz).onclick = () => {
    const datos = Object.fromEntries(CAMPOS.map((nombre) => [nombre, campo(nombre).value]));
    datos.metaMensual = leerEntero(datos.metaMensual);
    datos.comision = Number(String(datos.comision || '0').replace(',', '.'));
    if (datos.usuarioId) datos.tiendasAcceso = casillas.filter((casilla) => casilla.checked).map((casilla) => casilla.value);
    if (enEdicion) ejecutar(() => servicioEmpleados.actualizarEmpleado(enEdicion, datos), 'Empleado actualizado correctamente');
    else ejecutar(() => servicioEmpleados.agregarEmpleado(datos), 'Empleado registrado correctamente');
  };

  const editar = puede('empleados', 'editar');
  montarCuadricula(buscar('#cuadricula-empleados', raiz), {
    plantillas: plantillasCuadricula,
    titulo: 'Empleados',
    vacio: 'Aún no hay empleados en esta tienda.',
    columnas: [
      { clave: 'id', titulo: 'ID', ancho: '74px' },
      { clave: 'nombre', titulo: 'Nombre', ancho: 'minmax(140px, 1.2fr)' },
      { clave: 'cargo', titulo: 'Cargo', ancho: 'minmax(100px, 1fr)' },
      { clave: 'tienda', titulo: 'Tienda', ancho: '110px' },
      { clave: 'usuario', titulo: 'Usuario', ancho: '96px' },
      { clave: 'ventas', titulo: 'Ventas del mes', ancho: '120px', alinear: 'derecha' },
      { clave: 'meta', titulo: 'Meta', ancho: '110px', filtrable: false, html: (fila) => fila.avance },
      { clave: 'comision', titulo: 'Comisión', ancho: '110px', alinear: 'derecha' },
      { clave: 'estado', titulo: 'Estado', ancho: '84px' },
      { clave: 'acciones', titulo: 'Acciones', ancho: '270px', filtrable: false, html: (fila) => fila.acciones },
    ],
    filas: empleadosDeLaVista().map((empleado) => {
      const resultado = servicioEmpleados.desempenoDelMes(empleado);
      const usuario = servicioEmpleados.usuarioDeEmpleado(empleado);
      return {
        id: empleado.id,
        nombre: empleado.nombre,
        cargo: empleado.cargo,
        tienda: nombreDeTienda(empleado.tiendaId),
        usuario: usuario ? (usuario.activo ? 'Activo' : 'Inactivo') : 'Sin usuario',
        ventas: `${aPesos(resultado.total)} (${resultado.cantidad})`,
        meta: resultado.avance ?? 0,
        avance: resultado.avance === null
          ? '<span class="texto-suave">Sin meta</span>'
          : repetir(documento, 'avance', [{ texto: `${resultado.avance} %`, ancho: Math.min(100, Math.max(0, resultado.avance)), titulo: `Meta: ${aPesos(empleado.metaMensual)}` }]),
        comision: `${aPesos(resultado.comision)} · ${String(empleado.comision ?? 0).replace('.', ',')} %`,
        estado: empleado.activo ? 'Activo' : 'Retirado',
        acciones: repetir(documento, 'acciones-empleado', [{
          id: empleado.id,
          edicion: editar ? repetir(documento, 'botones-edicion', [{
            id: empleado.id,
            textoEstado: empleado.activo ? 'Retirar' : 'Reintegrar',
            claseEstado: empleado.activo ? 'peligro' : '',
          }]) : '',
        }]),
      };
    }),
  });

  // --- Ficha del empleado -----------------------------------------------------------------------------------
  const ficha = crearFicha(buscar('#ficha-empleado', raiz), plantillasFicha);
  const abrirFicha = (id) => ficha.abrir(id, () => {
    const empleado = servicioEmpleados.buscarEmpleado(id);
    if (!empleado) return null;
    const resultado = servicioEmpleados.desempenoDelMes(empleado);
    const usuario = servicioEmpleados.usuarioDeEmpleado(empleado);
    const tiendasUsuario = usuario ? (usuario.tiendas?.length ? usuario.tiendas.map(nombreDeTienda).join(', ') : 'Todas las tiendas') : '';
    return {
      etiqueta: 'Ficha del empleado',
      titulo: `${empleado.nombre} · ${empleado.id}`,
      subtitulo: [empleado.cargo, nombreDeTienda(empleado.tiendaId), empleado.activo ? 'Activo' : 'Retirado'].join(' · '),
      indicadores: [
        { etiqueta: 'Ventas del mes', valor: aPesos(resultado.total) },
        { etiqueta: 'Avance de la meta', valor: resultado.avance === null ? 'Sin meta' : `${resultado.avance} %` },
        { etiqueta: 'Comisión estimada', valor: aPesos(resultado.comision) },
        { etiqueta: 'Cajas abiertas en el mes', valor: String(resultado.cajas) },
      ],
      datos: [
        { etiqueta: 'Documento', valor: `${empleado.tipoDocumento} ${empleado.documento}` },
        { etiqueta: 'Fecha de ingreso', valor: empleado.fechaIngreso ?? '' },
        { etiqueta: 'Teléfono', valor: empleado.telefono ?? '' },
        { etiqueta: 'Correo', valor: empleado.correo ?? '' },
        { etiqueta: 'Turno', valor: empleado.turno ?? '' },
        { etiqueta: 'Meta mensual', valor: empleado.metaMensual ? aPesos(empleado.metaMensual) : 'Sin meta' },
        { etiqueta: 'Comisión', valor: `${String(empleado.comision ?? 0).replace('.', ',')} %` },
        { etiqueta: 'Usuario del sistema', valor: usuario ? `${usuario.correo} · ${usuario.activo ? 'activo' : 'inactivo'}` : 'Sin usuario' },
        { etiqueta: 'Tiendas a las que entra', valor: tiendasUsuario, ancho: true },
      ],
      alEditar: editar ? () => abrirFormulario(servicioEmpleados.buscarEmpleado(id)) : null,
    };
  });

  buscar('#cuadricula-empleados', raiz).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    const empleado = servicioEmpleados.buscarEmpleado(boton.dataset.ficha ?? boton.dataset.editar ?? boton.dataset.estado);
    if (!empleado) return;
    if (boton.dataset.ficha) return abrirFicha(empleado.id);
    if (boton.dataset.editar) return abrirFormulario(empleado);
    if (!empleado.activo) return ejecutar(() => servicioEmpleados.cambiarEstadoEmpleado(empleado.id, true), `${empleado.nombre} reintegrado correctamente`);
    porRetirar = empleado.id;
    buscar('#texto-retiro', raiz).textContent = `¿Retirar a ${empleado.nombre}?${empleado.usuarioId ? ' Su usuario quedará inactivo.' : ''}`;
    buscar('#confirmar-retiro', raiz).hidden = false;
  });
  buscar('#retiro-no', raiz).onclick = () => { buscar('#confirmar-retiro', raiz).hidden = true; };
  buscar('#retiro-si', raiz).onclick = () => {
    const empleado = servicioEmpleados.buscarEmpleado(porRetirar);
    ejecutar(() => servicioEmpleados.cambiarEstadoEmpleado(porRetirar, false), `${empleado.nombre} retirado correctamente`);
  };
}
