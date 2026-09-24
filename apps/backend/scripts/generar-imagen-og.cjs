/**
 * Genera las imágenes para compartir el sitio (vista previa de WhatsApp,
 * Facebook, X, etc.) y el ícono de pantalla de inicio de iOS:
 *
 *   apps/frontend/public/og-image.jpg          1200x630
 *   apps/frontend/public/apple-touch-icon.png  180x180
 *
 * Dibuja con pdfkit (misma tipografía y colores que el membrete de los PDF) y
 * rasteriza con pdftoppm (paquete poppler-utils). Uso, desde la raíz:
 *
 *   node apps/backend/scripts/generar-imagen-og.cjs
 *
 * Tras cambiarla, WhatsApp/Facebook pueden seguir mostrando la vieja durante
 * días: sus cachés son por URL (en Facebook se refresca con el Sharing Debugger).
 */
const PDFDocument = require("pdfkit");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "../../..");
const PUBLICO = path.join(RAIZ, "apps/frontend/public");
const LOGO = path.join(PUBLICO, "logo-icon.png");
const LOGO_ASPECTO = 594 / 690;

const fuente = (f) => require.resolve(`@fontsource/${f}`);
const FUENTES = {
  display: fuente("quicksand/files/quicksand-latin-700-normal.woff"),
  cuerpo: fuente("nunito/files/nunito-latin-400-normal.woff"),
  cuerpoSemi: fuente("nunito/files/nunito-latin-600-normal.woff"),
  cuerpoBold: fuente("nunito/files/nunito-latin-700-normal.woff"),
};

const COLOR = {
  fondo: "#fdf3f4",
  salvia: "#5f7864",
  salviaOscuro: "#3d4e40",
  salviaClaro: "#e7ede8",
  rosa: "#c05468",
  rosaClaro: "#f6cad0",
  tinta: "#4c6150",
};

function rasterizar(pdf, salida, ancho, alto, formato) {
  const base = path.join(os.tmpdir(), `og-${process.pid}-${path.parse(salida).name}`);
  execFileSync("pdftoppm", [
    formato === "jpeg" ? "-jpeg" : "-png",
    ...(formato === "jpeg" ? ["-jpegopt", "quality=90"] : []),
    "-singlefile",
    "-scale-to-x", String(ancho),
    "-scale-to-y", String(alto),
    pdf,
    base,
  ]);
  const generado = `${base}.${formato === "jpeg" ? "jpg" : "png"}`;
  fs.copyFileSync(generado, salida);
  fs.unlinkSync(generado);
}

function crearPdf(ancho, alto, dibujar) {
  return new Promise((resolve) => {
    const archivo = path.join(os.tmpdir(), `og-${process.pid}-${ancho}x${alto}.pdf`);
    const doc = new PDFDocument({ size: [ancho, alto], margin: 0 });
    for (const [nombre, ruta] of Object.entries(FUENTES)) doc.registerFont(nombre, ruta);
    const stream = fs.createWriteStream(archivo);
    doc.pipe(stream);
    dibujar(doc);
    doc.end();
    stream.on("finish", () => resolve(archivo));
  });
}

function imagenCompartir(doc) {
  const W = 1200;
  const H = 630;
  doc.rect(0, 0, W, H).fill(COLOR.fondo);

  // Círculos decorativos suaves
  doc.circle(1130, 40, 190).fillOpacity(0.55).fill(COLOR.rosaClaro);
  doc.circle(80, 640, 170).fillOpacity(0.7).fill(COLOR.salviaClaro);
  doc.fillOpacity(1);

  // Logo sobre disco blanco
  const cx = 290;
  const cy = 290;
  doc.circle(cx, cy, 190).fill("#ffffff");
  doc.circle(cx, cy, 190).lineWidth(3).stroke(COLOR.rosaClaro);
  const logoW = 250;
  doc.image(LOGO, cx - logoW / 2, cy - (logoW * LOGO_ASPECTO) / 2, { width: logoW });

  // Texto
  const x = 540;
  doc.font("cuerpoBold").fontSize(22).fillColor(COLOR.rosa).text("LILYMEDICAL", x, 120, { characterSpacing: 4 });
  doc.font("display").fontSize(66).fillColor(COLOR.salviaOscuro).text("Dra. Lilia Figuera", x, 158, { width: 620 });
  doc.font("cuerpoSemi").fontSize(34).fillColor(COLOR.rosa).text("Médico Fisiatra", x, doc.y + 4);
  doc.rect(x, doc.y + 22, 90, 5).fill(COLOR.salvia);
  doc
    .font("cuerpo")
    .fontSize(30)
    .fillColor(COLOR.tinta)
    .text("Medicina física y rehabilitación\nen Puerto La Cruz", x, doc.y + 48, { width: 620, lineGap: 4 });

  // Banda inferior
  doc.rect(0, 530, W, 100).fill(COLOR.salvia);
  doc.font("cuerpoBold").fontSize(30).fillColor("#ffffff").text("lilymedical.com.ve", 80, 563);
  doc
    .font("cuerpoSemi")
    .fontSize(26)
    .fillColor("#ffffff")
    .text("Citas: 0414-7964640   ·   @dra.fisya", 540, 566, { width: 580, align: "right" });
}

function iconoApple(doc) {
  const S = 180;
  doc.rect(0, 0, S, S).fill("#ffffff");
  const w = 140;
  doc.image(LOGO, (S - w) / 2, (S - w * LOGO_ASPECTO) / 2, { width: w });
}

(async () => {
  const og = await crearPdf(1200, 630, imagenCompartir);
  rasterizar(og, path.join(PUBLICO, "og-image.jpg"), 1200, 630, "jpeg");
  const icono = await crearPdf(180, 180, iconoApple);
  rasterizar(icono, path.join(PUBLICO, "apple-touch-icon.png"), 180, 180, "png");
  for (const f of [og, icono]) fs.unlinkSync(f);
  console.log("Listo: public/og-image.jpg y public/apple-touch-icon.png");
})();
