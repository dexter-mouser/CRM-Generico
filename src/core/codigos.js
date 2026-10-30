// Siguiente código consecutivo: siguienteCodigo(['V-0001', 'V-0007'], 'V', 4) -> 'V-0008'
export function siguienteCodigo(codigos, prefijo, ancho) {
  const mayor = codigos
    .map((codigo) => parseInt(String(codigo).replace(/^\D+/, ''), 10) || 0)
    .reduce((acumulado, numero) => Math.max(acumulado, numero), 0);
  return `${prefijo}-${String(mayor + 1).padStart(ancho, '0')}`;
}
