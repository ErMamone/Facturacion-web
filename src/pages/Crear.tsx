import { useState, type FormEvent } from "react";
import { crearFactura, descargarPdf, type Empresa, type FacturaCreada, type Moneda } from "../api";
import { errorCuit, limpiarCuit } from "../cuit";
import { aCentavos, centavosATexto, formatearFecha, formatearMonto } from "../dinero";

const MAX_ITEMS = 50;

interface Fila {
  clave: number;
  nombre: string;
  cantidad: string;
  precio: string;
}

let proximaClave = 1;
const filaVacia = (): Fila => ({ clave: proximaClave++, nombre: "", cantidad: "1", precio: "" });
const empresaVacia = (): Empresa => ({ cuit: "", nombre: "" });

function errorCantidad(texto: string): string | null {
  return /^\d+$/.test(texto.trim()) && Number(texto) > 0 ? null : "Entero mayor a 0";
}

function errorPrecio(texto: string): string | null {
  const c = aCentavos(texto);
  return c !== null && c > 0 ? null : "Mayor a 0, hasta 2 decimales";
}

/** Subtotal en centavos, o null si la fila todavía no tiene números válidos. */
function subtotal(fila: Fila): number | null {
  const c = aCentavos(fila.precio);
  if (errorCantidad(fila.cantidad) || c === null) return null;
  return c * Number(fila.cantidad);
}

export default function Crear() {
  const [vendedor, setVendedor] = useState(empresaVacia);
  const [comprador, setComprador] = useState(empresaVacia);
  const [moneda, setMoneda] = useState<Moneda>("ARS");
  const [filas, setFilas] = useState<Fila[]>(() => [filaVacia()]);
  const [tipoCambio, setTipoCambio] = useState("");
  const [errTipoCambio, setErrTipoCambio] = useState<string | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<FacturaCreada | null>(null);

  // --- Validación ---
  const errCuitVendedor = errorCuit(vendedor.cuit);
  let errCuitComprador = errorCuit(comprador.cuit);
  if (!errCuitVendedor && !errCuitComprador && limpiarCuit(vendedor.cuit) === limpiarCuit(comprador.cuit)) {
    errCuitComprador = "Tiene que ser distinto del vendedor";
  }
  const errNombreVendedor = vendedor.nombre.trim() ? null : "Ingresá el nombre";
  const errNombreComprador = comprador.nombre.trim() ? null : "Ingresá el nombre";
  const erroresFilas = filas.map((f) => ({
    nombre: f.nombre.trim() ? null : "Ingresá la descripción",
    cantidad: errorCantidad(f.cantidad),
    precio: errorPrecio(f.precio),
  }));
  const hayErrores =
    !!(errCuitVendedor || errCuitComprador || errNombreVendedor || errNombreComprador) ||
    erroresFilas.some((e) => e.nombre || e.cantidad || e.precio);

  const total = filas.reduce((acc, f) => acc + (subtotal(f) ?? 0), 0);

  // --- Ítems ---
  function cambiarFila(clave: number, campo: keyof Omit<Fila, "clave">, valor: string) {
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f)));
  }

  // --- Conversor ---
  const otraMoneda: Moneda = moneda === "ARS" ? "USD" : "ARS";

  function convertir() {
    const tc = Number(tipoCambio.trim().replace(",", "."));
    if (!(tc > 0)) {
      setErrTipoCambio("Ingresá un tipo de cambio mayor a 0");
      return;
    }
    setErrTipoCambio(null);
    setFilas((fs) =>
      fs.map((f) => {
        const c = aCentavos(f.precio);
        if (c === null) return f;
        const convertido = moneda === "ARS" ? Math.round(c / tc) : Math.round(c * tc);
        return { ...f, precio: centavosATexto(convertido) };
      }),
    );
    setMoneda(otraMoneda);
  }

  // --- Envío ---
  async function guardar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (hayErrores) return;

    setEnviando(true);
    setError(null);
    try {
      const factura = await crearFactura({
        vendedor: { cuit: limpiarCuit(vendedor.cuit), nombre: vendedor.nombre.trim() },
        comprador: { cuit: limpiarCuit(comprador.cuit), nombre: comprador.nombre.trim() },
        moneda,
        items: filas.map((f) => ({
          nombre: f.nombre.trim(),
          cantidad: Number(f.cantidad),
          precio: aCentavos(f.precio)! / 100,
        })),
      });
      setCreada(factura);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  function empezarDeNuevo() {
    setVendedor(empresaVacia());
    setComprador(empresaVacia());
    setMoneda("ARS");
    setFilas([filaVacia()]);
    setTipoCambio("");
    setErrTipoCambio(null);
    setIntentado(false);
    setError(null);
    setCreada(null);
  }

  if (creada) {
    return (
      <article className="exito">
        <h2>✅ Factura creada</h2>
        <p>
          ID de la factura: <code>{creada.id}</code>
        </p>
        <p>
          Total: <strong>{formatearMonto(creada.total, creada.moneda)}</strong> · Disponible hasta el{" "}
          {formatearFecha(creada.expiresAt)}
        </p>
        <div className="acciones">
          <button onClick={() => descargarPdf(creada.id)}>Descargar PDF</button>
          <button className="secondary outline" onClick={empezarDeNuevo}>
            Crear otra
          </button>
        </div>
      </article>
    );
  }

  // Los errores se muestran recién después del primer intento de guardar.
  const ver = (err: string | null) => (intentado ? err : null);

  return (
    <>
      <hgroup>
        <h1>Nueva factura</h1>
        <p>Completá los datos y agregá los ítems. El total se calcula solo.</p>
      </hgroup>

      <form onSubmit={guardar} noValidate>
        <div className="grid">
          <DatosEmpresa
            titulo="Vendedor"
            empresa={vendedor}
            onChange={setVendedor}
            errCuit={ver(errCuitVendedor)}
            errNombre={ver(errNombreVendedor)}
          />
          <DatosEmpresa
            titulo="Comprador"
            empresa={comprador}
            onChange={setComprador}
            errCuit={ver(errCuitComprador)}
            errNombre={ver(errNombreComprador)}
          />
        </div>

        <article>
          <header className="encabezado-items">
            <strong>Ítems</strong>
            <label className="moneda">
              Moneda
              <select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
                <option value="ARS">ARS — Pesos</option>
                <option value="USD">USD — Dólares</option>
              </select>
            </label>
          </header>

          <div className="fila-item cabecera" aria-hidden>
            <span>Descripción</span>
            <span>Cantidad</span>
            <span>Precio unitario</span>
            <span className="num">Subtotal</span>
            <span></span>
          </div>

          {filas.map((f, i) => {
            const errs = erroresFilas[i];
            const sub = subtotal(f);
            return (
              <div className="fila-item" key={f.clave}>
                <div>
                  <input
                    aria-label="Descripción"
                    placeholder="Descripción"
                    value={f.nombre}
                    onChange={(e) => cambiarFila(f.clave, "nombre", e.target.value)}
                    aria-invalid={ver(errs.nombre) ? true : undefined}
                  />
                  {ver(errs.nombre) && <small>{errs.nombre}</small>}
                </div>
                <div>
                  <input
                    aria-label="Cantidad"
                    placeholder="Cant."
                    inputMode="numeric"
                    value={f.cantidad}
                    onChange={(e) => cambiarFila(f.clave, "cantidad", e.target.value)}
                    aria-invalid={ver(errs.cantidad) ? true : undefined}
                  />
                  {ver(errs.cantidad) && <small>{errs.cantidad}</small>}
                </div>
                <div>
                  <input
                    aria-label="Precio unitario"
                    placeholder="0,00"
                    inputMode="decimal"
                    value={f.precio}
                    onChange={(e) => cambiarFila(f.clave, "precio", e.target.value)}
                    aria-invalid={ver(errs.precio) ? true : undefined}
                  />
                  {ver(errs.precio) && <small>{errs.precio}</small>}
                </div>
                <div className="num subtotal">{sub === null ? "—" : formatearMonto(sub / 100, moneda)}</div>
                <div>
                  <button
                    type="button"
                    className="secondary outline quitar"
                    onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
                    disabled={filas.length === 1}
                    aria-label="Quitar ítem"
                    title="Quitar ítem"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="outline chico"
            onClick={() => setFilas((fs) => [...fs, filaVacia()])}
            disabled={filas.length >= MAX_ITEMS}
          >
            + Agregar ítem
          </button>
          {filas.length >= MAX_ITEMS && <small className="secundario"> Máximo {MAX_ITEMS} ítems.</small>}

          <footer className="total">
            <span>Total</span>
            <strong>{formatearMonto(total / 100, moneda)}</strong>
          </footer>
        </article>

        <details>
          <summary>Convertir precios a {otraMoneda}</summary>
          <div className="conversor">
            <label>
              Tipo de cambio (ARS por 1 USD)
              <input
                inputMode="decimal"
                placeholder="Ej.: 1250,50"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(e.target.value)}
                aria-invalid={errTipoCambio ? true : undefined}
              />
              {errTipoCambio && <small>{errTipoCambio}</small>}
            </label>
            <button type="button" className="secondary" onClick={convertir}>
              Convertir a {otraMoneda}
            </button>
          </div>
          <small className="secundario">
            Recalcula el precio de todos los ítems y cambia la moneda de la factura.
          </small>
        </details>

        {error && <p className="aviso-error">{error}</p>}
        {intentado && hayErrores && <p className="aviso-error">Revisá los campos marcados en rojo.</p>}

        <button type="submit" aria-busy={enviando} disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar factura"}
        </button>
      </form>
    </>
  );
}

function DatosEmpresa(props: {
  titulo: string;
  empresa: Empresa;
  onChange: (e: Empresa) => void;
  errCuit: string | null;
  errNombre: string | null;
}) {
  const { titulo, empresa, onChange, errCuit, errNombre } = props;
  return (
    <fieldset className="tarjeta">
      <legend>{titulo}</legend>
      <label>
        CUIT
        <input
          inputMode="numeric"
          placeholder="20-12345678-9"
          value={empresa.cuit}
          onChange={(e) => onChange({ ...empresa, cuit: e.target.value })}
          aria-invalid={errCuit ? true : undefined}
        />
        {errCuit && <small>{errCuit}</small>}
      </label>
      <label>
        Nombre o razón social
        <input
          value={empresa.nombre}
          onChange={(e) => onChange({ ...empresa, nombre: e.target.value })}
          aria-invalid={errNombre ? true : undefined}
        />
        {errNombre && <small>{errNombre}</small>}
      </label>
    </fieldset>
  );
}
