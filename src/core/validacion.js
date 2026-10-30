// Reglas de validación compartidas. Es JavaScript puro, sin navegador ni almacenamiento: el mismo archivo
// se puede ejecutar en Node y sus reglas están descritas en docs/validacion.md para repetirlas en el backend.
// Todas las funciones lanzan un Error con un mensaje en español listo para mostrar.

export const LIMITES = {
  texto: 120,
  textoLargo: 300,
  motivo: 200,
  minimoMotivo: 5,
  valorMaximo: 1_000_000_000,
  archivoMaximoBytes: 10 * 1024 * 1024,
};

export const PATRONES = {
  correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  telefono: /^[\d\s()+-]{7,20}$/,
  codigo: /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/,
  fecha: /^\d{4}-\d{2}-\d{2}$/,
};

// Quita caracteres de control y espacios sobrantes
export const limpiarTexto = (valor) => String(valor ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

export function exigirTexto(valor, etiqueta, { obligatorio = true, maximo = LIMITES.texto, minimo = 0 } = {}) {
  const texto = limpiarTexto(valor);
  if (obligatorio && !texto) throw new Error(`Escribe ${etiqueta}`);
  if (texto && texto.length < minimo) throw new Error(`${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} debe tener al menos ${minimo} caracteres`);
  if (texto.length > maximo) throw new Error(`${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} no puede superar ${maximo} caracteres`);
  return texto;
}

export function exigirEntero(valor, etiqueta, { minimo = 0, maximo = LIMITES.valorMaximo } = {}) {
  if (!Number.isInteger(valor)) throw new Error(`Escribe ${etiqueta} con un número entero`);
  if (valor < minimo) throw new Error(`${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} no puede ser menor que ${minimo}`);
  if (valor > maximo) throw new Error(`${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} es demasiado grande`);
  return valor;
}

export function exigirCorreo(valor, { obligatorio = true } = {}) {
  const correo = limpiarTexto(valor).toLowerCase();
  if (!correo && !obligatorio) return '';
  if (!PATRONES.correo.test(correo) || correo.length > LIMITES.texto) throw new Error('Escribe un correo válido, por ejemplo nombre@tienda.com');
  return correo;
}

export function exigirTelefono(valor) {
  const telefono = limpiarTexto(valor);
  if (telefono && !PATRONES.telefono.test(telefono)) throw new Error('El teléfono solo puede tener números, espacios, paréntesis, + y -');
  return telefono;
}

export function exigirFecha(valor, etiqueta = 'la fecha') {
  if (!PATRONES.fecha.test(String(valor)) || Number.isNaN(new Date(`${valor}T00:00:00`).getTime())) throw new Error(`Elige ${etiqueta}`);
  return valor;
}

export const exigirMotivo = (valor) => exigirTexto(valor, 'el motivo', { maximo: LIMITES.motivo, minimo: LIMITES.minimoMotivo });

// Datos de un producto del inventario (el ID es opcional: se genera uno si está vacío)
export function validarProducto({ id = '', referencia = '', nombre, costo, existencias }) {
  const idLimpio = limpiarTexto(id);
  if (idLimpio && !PATRONES.codigo.test(idLimpio)) throw new Error(`El ID "${idLimpio}" solo puede tener letras, números, punto, guion y guion bajo`);
  return {
    id: idLimpio,
    referencia: exigirTexto(referencia, 'la referencia', { obligatorio: false, maximo: 40 }),
    nombre: exigirTexto(nombre, 'el nombre del producto'),
    costo: exigirEntero(costo, 'el costo'),
    existencias: exigirEntero(existencias, 'el stock', { minimo: -LIMITES.valorMaximo }),
  };
}

// Líneas de venta o factura: cantidad entera ≥ 1 y valor entero > 0
export function validarLineas(lineas, campoValor, etiquetaValor) {
  if (!lineas.length) throw new Error('Agrega al menos un producto');
  for (const linea of lineas) {
    if (!Number.isInteger(linea.cantidad) || linea.cantidad < 1) throw new Error(`La cantidad de ${linea.nombre} debe ser al menos 1`);
    if (!Number.isInteger(linea[campoValor]) || linea[campoValor] < 1) throw new Error(`Escribe ${etiquetaValor} de ${linea.nombre}`);
    if (linea.cantidad > LIMITES.valorMaximo || linea[campoValor] > LIMITES.valorMaximo) throw new Error(`Los valores de ${linea.nombre} son demasiado grandes`);
  }
}

// --- Esquema de la copia de seguridad -------------------------------------------------------------------
// Tipos: texto, textoOpcional, entero, enteroNoNegativo, fecha, booleano, objeto, lista:<esquema>
const ESQUEMA_ITEM_VENTA = { productoId: 'texto', nombre: 'texto', cantidad: 'enteroNoNegativo', valorUnitario: 'enteroNoNegativo' };

export const ESQUEMA_DATOS = {
  productos: { id: 'texto', referencia: 'textoOpcional', nombre: 'texto', costo: 'enteroNoNegativo', existencias: 'entero' },
  ventas: { id: 'texto', fecha: 'fecha', cliente: 'texto', metodo: 'texto', total: 'enteroNoNegativo', items: ['lista', ESQUEMA_ITEM_VENTA] },
  facturas: { numero: 'texto', proveedor: 'texto', fecha: 'texto', total: 'enteroNoNegativo', items: ['lista', { productoId: 'texto', nombre: 'texto', cantidad: 'enteroNoNegativo', costoUnitario: 'enteroNoNegativo' }] },
  clientes: { id: 'texto', nombre: 'texto', telefono: 'textoOpcional', correo: 'textoOpcional', direccion: 'textoOpcional' },
  pagos: { id: 'texto', fecha: 'fecha', tipo: 'texto', tercero: 'texto', metodo: 'texto', valor: 'enteroNoNegativo' },
  documentos: { id: 'texto', tipo: 'texto', fecha: 'fecha', cliente: 'texto', total: 'enteroNoNegativo', items: ['lista', ESQUEMA_ITEM_VENTA] },
  devoluciones: { id: 'texto', ventaId: 'texto', fecha: 'fecha', tipo: 'texto', motivo: 'texto', metodo: 'texto', total: 'enteroNoNegativo', items: ['lista', ESQUEMA_ITEM_VENTA] },
  cajas: { id: 'texto', apertura: 'fecha', base: 'enteroNoNegativo' },
  movimientosCaja: { id: 'texto', cajaId: 'texto', fecha: 'fecha', tipo: 'texto', concepto: 'texto', valor: 'enteroNoNegativo' },
  contabilidad: { dia: 'texto', cerradoEn: 'fecha' },
  auditoria: { id: 'texto', fecha: 'fecha', usuario: 'texto', modulo: 'texto', accion: 'texto', detalle: 'textoOpcional' },
  roles: { id: 'texto', nombre: 'texto', protegido: 'booleano', permisos: 'objeto' },
  usuarios: { id: 'texto', nombre: 'texto', correo: 'texto', rolId: 'texto', activo: 'booleano' },
};

const TIPOS = {
  texto: (valor) => typeof valor === 'string' && valor.length > 0 && valor.length <= LIMITES.textoLargo * 4,
  textoOpcional: (valor) => valor === undefined || (typeof valor === 'string' && valor.length <= LIMITES.textoLargo * 4),
  entero: (valor) => Number.isInteger(valor) && Math.abs(valor) <= LIMITES.valorMaximo,
  enteroNoNegativo: (valor) => Number.isInteger(valor) && valor >= 0 && valor <= LIMITES.valorMaximo,
  fecha: (valor) => typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime()),
  booleano: (valor) => typeof valor === 'boolean',
  objeto: (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor),
};

function validarRegistro(registro, esquema, ruta) {
  if (!TIPOS.objeto(registro)) throw new Error(`${ruta}: no es un registro válido`);
  for (const [campo, tipo] of Object.entries(esquema)) {
    if (Array.isArray(tipo)) {
      if (!Array.isArray(registro[campo])) throw new Error(`${ruta}: falta la lista "${campo}"`);
      registro[campo].forEach((hijo, posicion) => validarRegistro(hijo, tipo[1], `${ruta}.${campo}[${posicion + 1}]`));
    } else if (!TIPOS[tipo](registro[campo])) {
      throw new Error(`${ruta}: el campo "${campo}" no es válido`);
    }
  }
}

// Valida toda la estructura de datos de la aplicación (copia de seguridad) y devuelve el conteo por sección
export function validarDatos(datos) {
  if (!TIPOS.objeto(datos)) throw new Error('El archivo no contiene datos de la aplicación');
  const conteo = {};
  for (const [seccion, esquema] of Object.entries(ESQUEMA_DATOS)) {
    // Las copias hechas antes de existir remisiones y cotizaciones no traen "documentos": se toman como vacías
    if (seccion === 'documentos' && datos[seccion] === undefined) datos[seccion] = [];
    const lista = datos[seccion];
    if (!Array.isArray(lista)) throw new Error(`Falta la sección "${seccion}"`);
    lista.forEach((registro, posicion) => validarRegistro(registro, esquema, `${seccion}[${posicion + 1}]`));
    conteo[seccion] = lista.length;
  }
  if (!TIPOS.objeto(datos.ajustes) || !TIPOS.objeto(datos.ajustes.tienda) || !TIPOS.objeto(datos.ajustes.ventas) || !TIPOS.objeto(datos.ajustes.recibo)) {
    throw new Error('Faltan los ajustes de la tienda');
  }
  if (!Array.isArray(datos.ajustes.ventas.metodosPago) || !datos.ajustes.ventas.metodosPago.length) throw new Error('Los ajustes no tienen métodos de pago');
  if (!Array.isArray(datos.orden)) throw new Error('Falta el orden del panel');
  if (!datos.roles.some((rol) => rol.protegido)) throw new Error('Debe existir el rol Propietario');
  if (!datos.usuarios.some((usuario) => usuario.activo && datos.roles.some((rol) => rol.id === usuario.rolId && rol.protegido))) {
    throw new Error('Debe quedar al menos un propietario activo');
  }
  return conteo;
}
