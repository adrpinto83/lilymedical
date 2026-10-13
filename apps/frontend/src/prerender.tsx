import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "./modules/landing/LandingPage";

/**
 * Portada ya escrita en HTML, generada al compilar (ver scripts/prerender.mjs).
 *
 * Google ejecuta JavaScript, pero otros buscadores y asistentes de IA no: sin
 * esto veían un <div id="root"> vacío. El navegador muestra este HTML al
 * instante y React lo reemplaza por la portada interactiva al cargar.
 */
export function renderizarPortada(): string {
  return renderToString(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>
  );
}
