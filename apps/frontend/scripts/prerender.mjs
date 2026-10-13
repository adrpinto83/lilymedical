// Genera dist/portada.html: el index.html compilado con la portada ya
// renderizada dentro de #root. El backend la sirve solo en "/"; el resto de
// rutas sigue con index.html vacío para no mostrar la portada un instante
// antes de, por ejemplo, el login.
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const salidaSsr = path.join(raiz, "dist-prerender");

await build({
  root: raiz,
  logLevel: "warn",
  build: { ssr: "src/prerender.tsx", outDir: salidaSsr, emptyOutDir: true },
});

const { renderizarPortada } = await import(pathToFileURL(path.join(salidaSsr, "prerender.js")).href);
const html = renderizarPortada();

const plantilla = await readFile(path.join(raiz, "dist", "index.html"), "utf8");
const vacio = '<div id="root"></div>';
if (!plantilla.includes(vacio)) throw new Error(`dist/index.html no contiene ${vacio}`);

await writeFile(path.join(raiz, "dist", "portada.html"), plantilla.replace(vacio, `<div id="root">${html}</div>`));
await rm(salidaSsr, { recursive: true, force: true });
console.log(`dist/portada.html generado (${Math.round(html.length / 1024)} KB de HTML de la portada)`);
