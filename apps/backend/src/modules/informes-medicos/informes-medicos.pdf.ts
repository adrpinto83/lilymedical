import fs from "fs";
import { Prisma } from "@prisma/client";
import {
  dibujarEncabezadoTarjeta,
  dibujarLineaCredenciales,
  dibujarCajaContenido,
  dibujarCamposPaciente,
  dibujarPieContacto,
  Membrete,
} from "../../lib/pdf";

type InformeConPaciente = Prisma.InformeMedicoGetPayload<{ include: { paciente: true } }>;

const INK = "#15304a";
const GRIS = "#4c6478";
const SAGE = "#7c8c81";

// Misma caja que constancias y recetas (talonario media carta).
const BOX_Y = 128;
const BOX_ALTURA = 400;
const BOX_X = 34;
const BOX_ANCHO = 328;
// Espacio reservado al pie de la caja para la firma del médico.
const ALTO_FIRMA = 70;
const LIMITE_TEXTO = BOX_Y + BOX_ALTURA - ALTO_FIRMA;
const ESPACIO = 6;

// El texto se achica hasta este tamaño para caber en una hoja, como cuando
// se escribe más apretado a mano; si aún no cabe, sigue en otra hoja.
const TAMANOS = [9.5, 9, 8.5, 8, 7.5, 7];

interface Bloque {
  texto: string;
  titulo?: boolean;
}

function opciones() {
  return { width: BOX_ANCHO, align: "justify" as const, lineGap: 2.5 };
}

function usarFuente(doc: PDFKit.PDFDocument, bloque: Bloque, tamano: number) {
  doc.font(bloque.titulo ? "Body-Bold" : "Body").fontSize(tamano).fillColor(bloque.titulo ? INK : GRIS);
}

function altoTotal(doc: PDFKit.PDFDocument, bloques: Bloque[], tamano: number) {
  return bloques.reduce((h, b) => {
    usarFuente(doc, b, tamano);
    return h + doc.heightOfString(b.texto, opciones()) + ESPACIO;
  }, 0);
}

// Parte el texto por palabras: lo que cabe en `alto` y lo que sobra.
function partirTexto(doc: PDFKit.PDFDocument, texto: string, alto: number): [string, string] {
  const palabras = texto.split(" ");
  let lo = 0;
  let hi = palabras.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.heightOfString(palabras.slice(0, mid).join(" "), opciones()) <= alto) lo = mid;
    else hi = mid - 1;
  }
  return [palabras.slice(0, lo).join(" "), palabras.slice(lo).join(" ")];
}

function dibujarFirma(doc: PDFKit.PDFDocument, membrete: Membrete) {
  const x = BOX_X + BOX_ANCHO - 140;
  const y = BOX_Y + BOX_ALTURA - ALTO_FIRMA + 6;
  if (membrete.firmaPath && fs.existsSync(membrete.firmaPath)) {
    try {
      doc.image(membrete.firmaPath, x + 10, y, { fit: [120, 40], align: "center" });
    } catch {
      // firma ilegible: queda la línea con el nombre
    }
  }
  doc.strokeColor(GRIS).lineWidth(0.5).moveTo(x, y + 42).lineTo(x + 140, y + 42).stroke();
  doc
    .font("Body-Bold")
    .fontSize(8)
    .fillColor(INK)
    .text(`Dra. ${membrete.medicoNombre} ${membrete.medicoApellido}`, x, y + 45, { width: 140, align: "center" });
  doc
    .font("Body")
    .fontSize(7)
    .fillColor(GRIS)
    .text(
      [membrete.tituloProfesional, membrete.colegiatura ? `MPPS ${membrete.colegiatura}` : null].filter(Boolean).join(" · "),
      x,
      doc.y,
      { width: 140, align: "center" }
    );
}

export async function generarInformeMedicoPdf(
  doc: PDFKit.PDFDocument,
  informe: InformeConPaciente,
  membrete: Membrete
) {
  const bloques: Bloque[] = [{ texto: informe.informe.trim() }];
  if (informe.indicaciones?.trim()) {
    bloques.push({ texto: "Se plantea:", titulo: true }, { texto: informe.indicaciones.trim() });
  }

  async function hoja(continuacion: boolean): Promise<number> {
    if (continuacion) doc.addPage();
    await dibujarEncabezadoTarjeta(doc, membrete);
    dibujarLineaCredenciales(doc, membrete, 100);
    dibujarCajaContenido(doc, BOX_Y, BOX_ALTURA);
    const y = dibujarCamposPaciente(doc, BOX_Y + 14, informe.paciente, informe.fecha);
    doc
      .fillColor(SAGE)
      .font("Display-Semi")
      .fontSize(12)
      .text(continuacion ? "Informe médico (continuación)" : "Informe médico", BOX_X, y);
    return doc.y + 8;
  }

  let y = await hoja(false);
  const tamano = TAMANOS.find((t) => altoTotal(doc, bloques, t) <= LIMITE_TEXTO - y) ?? TAMANOS[TAMANOS.length - 1];

  for (const bloque of bloques) {
    let resto = bloque.texto;
    while (resto) {
      usarFuente(doc, bloque, tamano);
      const disponible = LIMITE_TEXTO - y;
      if (doc.heightOfString(resto, opciones()) <= disponible) {
        doc.text(resto, BOX_X, y, opciones());
        y = doc.y + ESPACIO;
        resto = "";
      } else {
        // Un título no se parte: pasa entero a la hoja siguiente.
        const [cabe, sobra] = bloque.titulo ? ["", resto] : partirTexto(doc, resto, disponible);
        if (cabe) doc.text(cabe, BOX_X, y, opciones());
        dibujarPieContacto(doc, membrete, BOX_Y + BOX_ALTURA + 16);
        y = await hoja(true);
        resto = sobra;
      }
    }
  }

  dibujarFirma(doc, membrete);
  dibujarPieContacto(doc, membrete, BOX_Y + BOX_ALTURA + 16);
}
