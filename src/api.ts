// Contrato con el backend (ver 05-backend.md). Si cambia algún endpoint o campo,
// este es el único archivo a tocar.

export type Moneda = "ARS" | "USD";

export interface Empresa {
  cuit: string;
  nombre: string;
}

/** Cada fila de la búsqueda. */
export interface FacturaResumen {
  id: string;
  vendedor: Empresa;
  comprador: Empresa;
  moneda: Moneda;
  total: number;
  createdAt: string;
  expiresAt: string;
}

export interface Pagina<T> {
  items: T[];
  pagina: number; // base 0, como Spring
  totalPaginas: number;
}

export interface NuevaFactura {
  vendedor: Empresa;
  comprador: Empresa;
  moneda: Moneda;
  items: { nombre: string; cantidad: number; precio: number }[];
}

/** Respuesta del POST: 201 {id, total, moneda, expiresAt}. */
export interface FacturaCreada {
  id: string;
  total: number;
  moneda: Moneda;
  expiresAt: string;
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!res.ok) {
    // Los errores llegan como ProblemDetail (RFC 9457): {title, detail, status}.
    let mensaje = `Error ${res.status}`;
    try {
      const problema = await res.json();
      mensaje = problema.detail ?? problema.title ?? mensaje;
    } catch {
      // La respuesta no era JSON: queda el mensaje genérico.
    }
    throw new Error(mensaje);
  }
  return res.json();
}

/** GET /api/facturas?cuitVendedor=&cuitComprador=&page= (al menos un filtro). */
export async function buscarFacturas(filtro: {
  cuitVendedor?: string;
  cuitComprador?: string;
  pagina: number;
}): Promise<Pagina<FacturaResumen>> {
  const params = new URLSearchParams({ page: String(filtro.pagina) });
  if (filtro.cuitVendedor) params.set("cuitVendedor", filtro.cuitVendedor);
  if (filtro.cuitComprador) params.set("cuitComprador", filtro.cuitComprador);

  // Page de Spring: según la versión viene {content, totalPages, number}
  // o {content, page: {number, totalPages}}. Aceptamos las dos.
  const r = await pedir<any>(`/api/facturas?${params}`);
  return {
    items: r.content ?? [],
    pagina: r.page?.number ?? r.number ?? 0,
    totalPaginas: r.page?.totalPages ?? r.totalPages ?? 1,
  };
}

/** POST /api/facturas */
export function crearFactura(factura: NuevaFactura) {
  return pedir<FacturaCreada>("/api/facturas", {
    method: "POST",
    body: JSON.stringify(factura),
  });
}

/** Es navegación (no fetch): sigue el 302 a S3 sin problemas de CORS. */
export function descargarPdf(id: string) {
  window.location.href = `/api/facturas/${id}/pdf`;
}
