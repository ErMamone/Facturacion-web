// Validador de CUIT (módulo 11, misma lógica que el backend).
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function limpiarCuit(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function cuitValido(valor: string): boolean {
  const cuit = limpiarCuit(valor);
  if (!/^\d{11}$/.test(cuit)) return false;

  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(cuit[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto;
  if (verificador === 10) return false;

  return verificador === Number(cuit[10]);
}

/** Devuelve el mensaje de error, o null si el CUIT es válido. */
export function errorCuit(valor: string): string | null {
  const cuit = limpiarCuit(valor);
  if (!cuit) return "Ingresá un CUIT";
  if (cuit.length !== 11) return "El CUIT tiene 11 dígitos";
  if (!cuitValido(cuit)) return "El dígito verificador no coincide";
  return null;
}

/** 20123456789 → 20-12345678-9 */
export function formatearCuit(cuit: string): string {
  const c = limpiarCuit(cuit);
  return c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : cuit;
}
