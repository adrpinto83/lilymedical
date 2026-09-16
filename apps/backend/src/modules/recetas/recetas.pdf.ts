import { Prisma } from "@prisma/client";
import {
  dibujarEncabezadoTarjeta,
  dibujarLineaCredenciales,
  dibujarCajaContenido,
  dibujarCamposPaciente,
  dibujarPieContacto,
  Membrete,
} from "../../lib/pdf";

type RecetaConDetalle = Prisma.RecetaGetPayload<{
  include: { items: true; paciente: true; historiaClinica: { select: { alergias: true } } };
}>;

const BOX_Y = 128;
const BOX_ALTURA = 400;
const BOX_X = 34;
const BOX_ANCHO = 328;

export async function generarRecetaPdf(
  doc: PDFKit.PDFDocument,
  receta: RecetaConDetalle,
  membrete: Membrete
) {
  await dibujarEncabezadoTarjeta(doc, membrete, receta.codigoVerificacion);
  dibujarLineaCredenciales(doc, membrete, 100);
  dibujarCajaContenido(doc, BOX_Y, BOX_ALTURA);

  let y = dibujarCamposPaciente(doc, BOX_Y + 14, receta.paciente, receta.fecha);

  if (receta.historiaClinica?.alergias) {
    doc
      .font("Body-Bold")
      .fillColor("#b91c1c")
      .fontSize(8.5)
      .text(`⚠ Alergias: ${receta.historiaClinica.alergias}`, BOX_X, y, { width: BOX_ANCHO });
    y = doc.y + 8;
  }

  const etiqueta = receta.tipo === "MEDICAMENTO" ? "Recipe" : "Indicaciones";
  doc.fillColor("#7c8c81").font("Display-Semi").fontSize(12).text(etiqueta, BOX_X, y);
  y = doc.y + 8;

  if (receta.diagnostico) {
    doc.font("Body-Bold").fillColor("#15304a").fontSize(8).text("Diagnóstico", BOX_X, y);
    doc.font("Body").fillColor("#4c6478").fontSize(9).text(receta.diagnostico, BOX_X, doc.y, {
      width: BOX_ANCHO,
    });
    y = doc.y + 8;
  }

  receta.items.forEach((item, index) => {
    doc
      .font("Body-Bold")
      .fillColor("#15304a")
      .fontSize(9.5)
      .text(`${index + 1}. `, BOX_X, y, { continued: true, width: BOX_ANCHO });

    if (receta.tipo === "MEDICAMENTO") {
      doc.text(item.medicamento ?? "—");
      const detalle = [item.presentacion, item.dosis, item.frecuencia, item.duracion]
        .filter(Boolean)
        .join(" · ");
      if (detalle) {
        doc.font("Body").fillColor("#4c6478").fontSize(8.5).text(detalle, BOX_X + 12, doc.y, {
          width: BOX_ANCHO - 12,
        });
      }
    } else {
      doc.text(item.tipoTerapia ?? "—");
      const detalle = [item.sesiones ? `${item.sesiones} sesiones` : null, item.observaciones]
        .filter(Boolean)
        .join(" · ");
      if (detalle) {
        doc.font("Body").fillColor("#4c6478").fontSize(8.5).text(detalle, BOX_X + 12, doc.y, {
          width: BOX_ANCHO - 12,
        });
      }
    }
    y = doc.y + 8;
  });

  if (receta.indicacionesGenerales) {
    doc.font("Body-Bold").fillColor("#15304a").fontSize(8).text("Indicaciones generales", BOX_X, y, {
      width: BOX_ANCHO,
    });
    doc.font("Body").fillColor("#4c6478").fontSize(9).text(receta.indicacionesGenerales, BOX_X, doc.y, {
      width: BOX_ANCHO,
    });
    y = doc.y + 8;
  }

  if (receta.fechaVencimiento) {
    doc
      .font("Body")
      .fillColor("#4c6478")
      .fontSize(8)
      .text(`Válida hasta: ${receta.fechaVencimiento.toLocaleDateString("es-VE")}`, BOX_X, y, {
        width: BOX_ANCHO,
      });
  }

  dibujarPieContacto(doc, membrete, BOX_Y + BOX_ALTURA + 16);
}
