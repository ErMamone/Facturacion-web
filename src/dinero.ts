import type { Moneda } from "./api";

// Los montos se manejan en centavos (enteros) para evitar errores de coma flotante.

/** "1234,5" o "1234.50" → 123450. Null si no es un monto válido (máx. 2 decimales). */
export function aCentavos(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [entero, decimales = ""] = t.split(".");
  return Number(entero) * 100 + Number(decimales.padEnd(2, "0"));
}

/** 123450 → "1234,50" (para volver a cargar en un input). */
export function centavosATexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

const formatos: Record<Moneda, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }),
  USD: new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" }),
};

export function formatearMonto(monto: number, moneda: Moneda): string {
  return formatos[moneda].format(monto);
}

export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
