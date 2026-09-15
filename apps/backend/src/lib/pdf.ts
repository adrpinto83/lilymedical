import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { Response } from "express";

export interface Membrete {
  medicoNombre: string; // nombre de pila, ej. "Lilia"
  medicoApellido: string; // ej. "Figuera"
  tituloProfesional?: string | null; // ej. "Médico Fisiatra"
  colegiatura?: string | null; // MPPS
  cma?: string | null;
  rif?: string | null;
  instagram?: string | null;
  email?: string | null;
  direccionConsultorio?: string | null;
  telefonoConsultorio?: string | null;
  firmaPath?: string | null; // ruta absoluta en disco
}

const SAGE = "#7c8c81";
const PINK_DEEP = "#c05468";
const INK = "#15304a";
const GRIS = "#4c6478";
const GRIS_CLARO = "#dbe7ee";

// Resuelto desde cwd (no __dirname) para que funcione igual en dev (tsx,
// corriendo desde src/) y en producción (dist/), igual que UPLOADS_DIR.
const LOGO_PATH = path.resolve(process.cwd(), "assets", "logo-icon.png");
const LOGO_ASPECT = 594 / 690; // alto/ancho del asset extraído del membrete real

// Tipografía real de marca (Quicksand para el nombre/títulos, Nunito para
// texto de cuerpo) + Font Awesome para los íconos de contacto. Se usa
// .woff (no .woff2) porque fontkit falla al subsetear algunos woff2.
const FUENTE = {
  displayBold: require.resolve("@fontsource/quicksand/files/quicksand-latin-700-normal.woff"),
  displaySemi: require.resolve("@fontsource/quicksand/files/quicksand-latin-600-normal.woff"),
  body: require.resolve("@fontsource/nunito/files/nunito-latin-400-normal.woff"),
  bodyItalic: require.resolve("@fontsource/nunito/files/nunito-latin-400-italic.woff"),
  bodySemi: require.resolve("@fontsource/nunito/files/nunito-latin-600-normal.woff"),
  bodyBold: require.resolve("@fontsource/nunito/files/nunito-latin-700-normal.woff"),
  iconosSolidos: require.resolve("@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2"),
  iconosMarca: require.resolve("@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2"),
};

const ICONO = {
  whatsapp: "",
  instagram: "",
  email: "",
  ubicacion: "",
};

function registrarFuentes(doc: PDFKit.PDFDocument) {
  doc.registerFont("Display-Bold", FUENTE.displayBold);
  doc.registerFont("Display-Semi", FUENTE.displaySemi);
  doc.registerFont("Body", FUENTE.body);
  doc.registerFont("Body-Italic", FUENTE.bodyItalic);
  doc.registerFont("Body-Semi", FUENTE.bodySemi);
  doc.registerFont("Body-Bold", FUENTE.bodyBold);
  doc.registerFont("Icons-Solid", FUENTE.iconosSolidos);
  doc.registerFont("Icons-Brands", FUENTE.iconosMarca);
}

// Tamaños de página: "MEDIA_CARTA" para documentos tipo recetario/constancia
// (igual al formato físico que ya usa el consultorio), "CARTA" para reportes
// más largos como la historia clínica completa.
export function crearDocumentoPdf(tamano: "CARTA" | "MEDIA_CARTA" = "CARTA"): PDFKit.PDFDocument {
  const doc =
    tamano === "MEDIA_CARTA"
      ? new PDFDocument({ size: [396, 612], margin: 0 }) // 5.5" x 8.5"
      : new PDFDocument({ size: "LETTER", margin: 50 });
  registrarFuentes(doc);
  return doc;
}

// No cierra el documento: el caller debe escribir el contenido y luego
// llamar a `doc.end()` para que el PDF termine de transmitirse.
export function enviarPdfComoRespuesta(doc: PDFKit.PDFDocument, res: Response, nombreArchivo: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${nombreArchivo}"`);
  doc.pipe(res);
}

export async function generarQrVerificacion(codigo: string): Promise<Buffer> {
  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:5173";
  const url = `${baseUrl}/verificar/${codigo}`;
  return QRCode.toBuffer(url, { margin: 1, width: 200, color: { dark: INK, light: "#ffffff" } });
}

// El QR del encabezado apunta al Instagram del consultorio (igual que en
// el recetario físico original); si el médico no tiene Instagram cargado,
// cae de vuelta al QR de verificación del documento.
export async function generarQrEncabezado(membrete: Membrete, codigoVerificacion?: string): Promise<Buffer | null> {
  if (membrete.instagram) {
    const handle = membrete.instagram.replace(/^@/, "").trim();
    const url = `https://www.instagram.com/${handle}`;
    return QRCode.toBuffer(url, { margin: 1, width: 200, color: { dark: INK, light: "#ffffff" } });
  }
  if (codigoVerificacion) return generarQrVerificacion(codigoVerificacion);
  return null;
}

function dibujarLogo(doc: PDFKit.PDFDocument, x: number, y: number, width: number, opacidad = 1) {
  if (!fs.existsSync(LOGO_PATH)) return;
  doc.opacity(opacidad);
  doc.image(LOGO_PATH, x, y, { width, height: width * LOGO_ASPECT });
  doc.opacity(1);
}

// Encabezado tipo "tarjeta de receta": logo + nombre del médico + QR de
// Instagram, y debajo la línea de credenciales (MPPS/CMA/RIF).
export async function dibujarEncabezadoTarjeta(
  doc: PDFKit.PDFDocument,
  membrete: Membrete,
  codigoVerificacion?: string
) {
  const M = 22;
  const logoW = 66;

  dibujarLogo(doc, M, 18, logoW);

  const textoX = M + logoW + 10;
  doc
    .fillColor(SAGE)
    .font("Display-Bold")
    .fontSize(17)
    .text(`Dra. ${membrete.medicoNombre}`, textoX, 22, { lineGap: -3 })
    .text(membrete.medicoApellido, textoX, doc.y);
  doc
    .fillColor(PINK_DEEP)
    .font("Body-Semi")
    .fontSize(8.5)
    .text(membrete.tituloProfesional ?? "", textoX, doc.y + 3);

  // Divisor vertical + QR (Instagram del consultorio)
  const qrSize = 56;
  const qrX = 396 - M - qrSize;
  doc
    .strokeColor(GRIS_CLARO)
    .lineWidth(1)
    .moveTo(qrX - 12, 20)
    .lineTo(qrX - 12, 20 + qrSize)
    .stroke();

  const qrBuffer = await generarQrEncabezado(membrete, codigoVerificacion);
  if (qrBuffer) {
    doc.image(qrBuffer, qrX, 20, { width: qrSize, height: qrSize });
  }
}

export function dibujarLineaCredenciales(doc: PDFKit.PDFDocument, membrete: Membrete, y: number) {
  const items = [
    membrete.colegiatura ? `MPPS: ${membrete.colegiatura}` : null,
    membrete.cma ? `CMA: ${membrete.cma}` : null,
    membrete.rif ? `RIF: ${membrete.rif}` : null,
  ].filter(Boolean) as string[];

  let x = 22;
  for (const item of items) {
    doc.font("Body-Bold").fontSize(8).fillColor(SAGE).text("•", x, y, { continued: false });
    doc.font("Body").fillColor(INK).text(` ${item}`, x + 6, y, { continued: false });
    x += doc.widthOfString(` ${item}`) + 16;
  }

  doc
    .strokeColor(GRIS_CLARO)
    .lineWidth(1)
    .moveTo(22, y + 16)
    .lineTo(374, y + 16)
    .stroke();
}

// Caja con esquinas inferiores redondeadas (como el recetario físico),
// con marca de agua del logo de fondo.
export function dibujarCajaContenido(doc: PDFKit.PDFDocument, y: number, alturaCaja: number) {
  const x = 20;
  const w = 356;
  const radius = 18;

  doc
    .strokeColor(GRIS_CLARO)
    .lineWidth(1)
    .moveTo(x, y)
    .lineTo(x + w, y)
    .lineTo(x + w, y + alturaCaja - radius)
    .quadraticCurveTo(x + w, y + alturaCaja, x + w - radius, y + alturaCaja)
    .lineTo(x + radius, y + alturaCaja)
    .quadraticCurveTo(x, y + alturaCaja, x, y + alturaCaja - radius)
    .lineTo(x, y)
    .stroke();

  // Marca de agua: el mismo logo, grande y muy tenue, centrado en la caja
  const wmWidth = 230;
  const wmX = x + w / 2 - wmWidth / 2;
  const wmY = y + alturaCaja / 2 - (wmWidth * LOGO_ASPECT) / 2 + 10;
  dibujarLogo(doc, wmX, wmY, wmWidth, 0.06);
}

// Fila "Nombre / Cédula / Edad / Fecha" pre-llenada con los datos reales
// del paciente (a diferencia del talonario en papel, aquí no hace falta
// escribirlos a mano). Devuelve el Y donde continúa el contenido.
export function dibujarCamposPaciente(
  doc: PDFKit.PDFDocument,
  y: number,
  paciente: { nombres: string; apellidos: string; documento: string; fechaNacimiento: Date },
  fecha: Date
): number {
  const x = 34;
  const edad = Math.floor((Date.now() - paciente.fechaNacimiento.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  doc.font("Body-Bold").fontSize(8).fillColor(GRIS).text("Nombre", x, y, { continued: true });
  doc
    .font("Body")
    .fillColor(INK)
    .text(`  ${paciente.nombres} ${paciente.apellidos}`, { continued: false });

  const y2 = doc.y + 6;
  doc.font("Body-Bold").fontSize(8).fillColor(GRIS).text("Cédula", x, y2, { continued: true });
  doc.font("Body").fillColor(INK).text(`  ${paciente.documento}    `, { continued: true });
  doc.font("Body-Bold").fillColor(GRIS).text("Edad", { continued: true });
  doc.font("Body").fillColor(INK).text(`  ${edad} años    `, { continued: true });
  doc.font("Body-Bold").fillColor(GRIS).text("Fecha", { continued: true });
  doc.font("Body").fillColor(INK).text(`  ${fecha.toLocaleDateString("es-VE")}`, { continued: false });

  return doc.y + 10;
}

// Un ítem de contacto con ícono real (Font Awesome): devuelve el ancho
// total ocupado para poder encadenar el siguiente ítem en la misma fila.
function dibujarItemContacto(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  fuenteIcono: "Icons-Brands" | "Icons-Solid",
  icono: string,
  color: string,
  texto: string
): number {
  doc.font(fuenteIcono).fontSize(9).fillColor(color).text(icono, x, y, { continued: false });
  const iconoAncho = doc.widthOfString(icono);
  doc.font("Body").fontSize(7.5).fillColor(GRIS).text(texto, x + iconoAncho + 5, y + 1.2);
  return iconoAncho + 5 + doc.widthOfString(texto);
}

export function dibujarPieContacto(doc: PDFKit.PDFDocument, membrete: Membrete, y: number) {
  let x = 22;
  if (membrete.telefonoConsultorio) {
    x += dibujarItemContacto(doc, x, y, "Icons-Brands", ICONO.whatsapp, "#25d366", membrete.telefonoConsultorio) + 14;
  }
  if (membrete.instagram) {
    x += dibujarItemContacto(doc, x, y, "Icons-Brands", ICONO.instagram, "#c8348f", membrete.instagram) + 14;
  }
  if (membrete.email) {
    dibujarItemContacto(doc, x, y, "Icons-Solid", ICONO.email, "#4285f4", membrete.email);
  }

  if (membrete.direccionConsultorio) {
    dibujarItemContacto(doc, 22, y + 14, "Icons-Solid", ICONO.ubicacion, SAGE, membrete.direccionConsultorio);
  }
}

// Firma del médico, usada al pie de constancias/historias donde no aplica
// el formato de tarjeta (documentos tamaño carta).
export async function dibujarPiePagina(
  doc: PDFKit.PDFDocument,
  membrete: Membrete,
  codigoVerificacion?: string
) {
  const ALTO_PIE_PAGINA = 105;
  const anchoUtil = doc.page.width - doc.page.margins.right;
  const limiteInferior = doc.page.height - doc.page.margins.bottom;
  let y = limiteInferior - ALTO_PIE_PAGINA;

  if (doc.y > y - 10) {
    doc.addPage();
    y = doc.page.height - doc.page.margins.bottom - ALTO_PIE_PAGINA;
  }

  doc.strokeColor(GRIS_CLARO).lineWidth(1).moveTo(50, y).lineTo(anchoUtil, y).stroke();

  const firmaY = y + 14;
  if (membrete.firmaPath && fs.existsSync(membrete.firmaPath)) {
    try {
      doc.image(membrete.firmaPath, 50, firmaY, { width: 120, height: 50, fit: [120, 50] });
    } catch {
      // si la imagen no se puede leer, se omite y solo queda la línea/nombre
    }
  }
  doc.strokeColor(GRIS).lineWidth(0.5).moveTo(50, firmaY + 55).lineTo(220, firmaY + 55).stroke();
  doc
    .fillColor(INK)
    .fontSize(9)
    .font("Body-Bold")
    .text(`${membrete.medicoNombre} ${membrete.medicoApellido}`, 50, firmaY + 58);
  doc
    .fillColor(GRIS)
    .fontSize(8)
    .font("Body")
    .text(
      [membrete.tituloProfesional, membrete.colegiatura ? `MPPS ${membrete.colegiatura}` : null]
        .filter(Boolean)
        .join(" · "),
      50,
      firmaY + 71
    );

  if (codigoVerificacion) {
    const qrBuffer = await generarQrVerificacion(codigoVerificacion);
    const qrX = anchoUtil - 80;
    doc.image(qrBuffer, qrX, firmaY, { width: 70, height: 70 });
    doc
      .fillColor(GRIS)
      .fontSize(7)
      .font("Body")
      .text("Verificar autenticidad", qrX - 12, firmaY + 72, { width: 95, align: "center" });
  }
}

export function dibujarMembrete(
  doc: PDFKit.PDFDocument,
  membrete: Membrete,
  tituloDocumento: string,
  numeroDocumento: string,
  fecha: Date
) {
  const logoW = 46;
  dibujarLogo(doc, 50, 40, logoW);

  doc
    .fillColor(SAGE)
    .fontSize(16)
    .font("Display-Bold")
    .text(`Dra. ${membrete.medicoNombre} ${membrete.medicoApellido}`, 50 + logoW + 10, 44);
  doc
    .fillColor(PINK_DEEP)
    .fontSize(8.5)
    .font("Body-Semi")
    .text(membrete.tituloProfesional ?? "", 50 + logoW + 10, doc.y + 2);

  doc.y = 40 + logoW + 8;
  doc.x = 50;

  doc
    .strokeColor(GRIS_CLARO)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.8);

  doc.fillColor(INK).fontSize(14).font("Body-Bold").text(tituloDocumento);
  doc
    .fillColor(GRIS)
    .fontSize(9)
    .font("Body")
    .text(`N° ${numeroDocumento}  ·  ${fecha.toLocaleDateString("es-VE")}`);

  doc.moveDown(1);
}
