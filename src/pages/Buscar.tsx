import { useState, type FormEvent } from "react";
import { buscarFacturas, descargarPdf, type FacturaResumen, type Pagina } from "../api";
import { errorCuit, formatearCuit, limpiarCuit } from "../cuit";
import { formatearFecha, formatearMonto } from "../dinero";

interface Filtro {
  cuitVendedor: string;
  cuitComprador: string;
}

export default function Buscar() {
  const [vendedor, setVendedor] = useState("");
  const [comprador, setComprador] = useState("");
  const [intentado, setIntentado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Pagina<FacturaResumen> | null>(null);
  // El filtro de la última búsqueda, para paginar sin depender de lo que haya en los inputs.
  const [filtro, setFiltro] = useState<Filtro | null>(null);

  // Los dos campos son opcionales, pero si se completan tienen que ser válidos.
  const errVendedor = vendedor.trim() ? errorCuit(vendedor) : null;
  const errComprador = comprador.trim() ? errorCuit(comprador) : null;
  const faltaAlguno = !vendedor.trim() && !comprador.trim();

  async function cargar(f: Filtro, pagina: number) {
    setCargando(true);
    setError(null);
    try {
      setResultado(await buscarFacturas({ ...f, pagina }));
      setFiltro(f);
    } catch (err) {
      setError((err as Error).message);
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (faltaAlguno || errVendedor || errComprador) return;
    cargar({ cuitVendedor: limpiarCuit(vendedor), cuitComprador: limpiarCuit(comprador) }, 0);
  }

  return (
    <>
      <hgroup>
        <h1>Buscar facturas</h1>
        <p>Ingresá el CUIT del vendedor, del comprador, o ambos.</p>
      </hgroup>

      <form onSubmit={buscar} noValidate>
        <div className="grid">
          <label>
            CUIT vendedor
            <input
              inputMode="numeric"
              placeholder="20-12345678-9"
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              aria-invalid={intentado && errVendedor ? true : undefined}
            />
            {intentado && errVendedor && <small>{errVendedor}</small>}
          </label>
          <label>
            CUIT comprador
            <input
              inputMode="numeric"
              placeholder="30-12345678-1"
              value={comprador}
              onChange={(e) => setComprador(e.target.value)}
              aria-invalid={intentado && errComprador ? true : undefined}
            />
            {intentado && errComprador && <small>{errComprador}</small>}
          </label>
        </div>
        {intentado && faltaAlguno && <p className="aviso-error">Completá al menos un CUIT.</p>}
        <button type="submit" aria-busy={cargando} disabled={cargando}>
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <p className="aviso-error">{error}</p>}

      {resultado && resultado.items.length === 0 && (
        <article className="vacio">No encontramos facturas para esa búsqueda.</article>
      )}

      {resultado && resultado.items.length > 0 && (
        <>
          <TablaFacturas facturas={resultado.items} />
          {resultado.totalPaginas > 1 && filtro && (
            <div className="paginado">
              <button
                className="secondary outline chico"
                disabled={cargando || resultado.pagina === 0}
                onClick={() => cargar(filtro, resultado.pagina - 1)}
              >
                ← Anterior
              </button>
              <span>
                Página {resultado.pagina + 1} de {resultado.totalPaginas}
              </span>
              <button
                className="secondary outline chico"
                disabled={cargando || resultado.pagina + 1 >= resultado.totalPaginas}
                onClick={() => cargar(filtro, resultado.pagina + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function TablaFacturas({ facturas }: { facturas: FacturaResumen[] }) {
  return (
    <div className="overflow-auto">
      <table className="striped">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Vendedor</th>
            <th>Comprador</th>
            <th className="num">Total</th>
            <th>Vence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => (
            <tr key={f.id}>
              <td>{formatearFecha(f.createdAt)}</td>
              <td>
                {f.vendedor.nombre}
                <br />
                <small className="secundario">{formatearCuit(f.vendedor.cuit)}</small>
              </td>
              <td>
                {f.comprador.nombre}
                <br />
                <small className="secundario">{formatearCuit(f.comprador.cuit)}</small>
              </td>
              <td className="num">{formatearMonto(f.total, f.moneda)}</td>
              <td>{formatearFecha(f.expiresAt)}</td>
              <td>
                <button className="outline chico" onClick={() => descargarPdf(f.id)}>
                  Descargar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
