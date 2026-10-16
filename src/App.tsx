import { useEffect, useState, type MouseEvent } from "react";
import Buscar from "./pages/Buscar";
import Crear from "./pages/Crear";

type Ruta = "/" | "/crear";

function rutaActual(): Ruta {
  return window.location.pathname === "/crear" ? "/crear" : "/";
}

export default function App() {
  const [ruta, setRuta] = useState<Ruta>(rutaActual);

  useEffect(() => {
    const alVolver = () => setRuta(rutaActual());
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  function ir(destino: Ruta) {
    return (e: MouseEvent) => {
      e.preventDefault();
      if (destino !== ruta) window.history.pushState(null, "", destino);
      setRuta(destino);
    };
  }

  return (
    <>
      <header className="container">
        <nav>
          <ul>
            <li>
              <strong className="marca">🧾 Facturación</strong>
            </li>
          </ul>
          <ul>
            <li>
              <a href="/" onClick={ir("/")} aria-current={ruta === "/" ? "page" : undefined}>
                Buscar
              </a>
            </li>
            <li>
              <a href="/crear" onClick={ir("/crear")} aria-current={ruta === "/crear" ? "page" : undefined}>
                Nueva factura
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <main className="container">{ruta === "/" ? <Buscar /> : <Crear />}</main>
    </>
  );
}
