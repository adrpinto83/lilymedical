import { Prisma } from "@prisma/client";
import {
  dibujarEncabezadoTarjeta,
  dibujarLineaCredenciales,
  dibujarCajaContenido,
  dibujarCamposPaciente,
  dibujarPieContacto,
  Membrete,
} from "../../lib/pdf";

type PlanConDetalle = Prisma.PlanEjerciciosGetPayload<{
  include: { items: true; paciente: true };
}>;

const BOX_Y = 128;
const BOX_ALTURA = 400;
const BOX_X = 34;
const BOX_ANCHO = 328;

export async function generarPlanEjerciciosPdf(
  doc: PDFKit.PDFDocument,
  plan: PlanConDetalle,
  membrete: Membrete
) {
  await dibujarEncabezadoTarjeta(doc, membrete);
  dibujarLineaCredenciales(doc, membrete, 100);
  dibujarCajaContenido(doc, BOX_Y, BOX_ALTURA);

  let y = dibujarCamposPaciente(doc, BOX_Y + 14, plan.paciente, plan.fecha);

  doc.fillColor("#7c8c81").font("Display-Semi").fontSize(12).text("Plan de ejercicios", BOX_X, y);
  y = doc.y + 8;

  plan.items.forEach((item, index) => {
    doc
      .font("Body-Bold")
      .fillColor("#15304a")
      .fontSize(9.5)
      .text(`${index + 1}. ${item.nombre}`, BOX_X, y, { width: BOX_ANCHO });
    y = doc.y;

    if (item.repeticionesSugeridas) {
      doc.font("Body-Semi").fillColor("#7c8c81").fontSize(8.5).text(item.repeticionesSugeridas, BOX_X + 12, y, {
        width: BOX_ANCHO - 12,
      });
      y = doc.y;
    }
    if (item.descripcion) {
      doc.font("Body").fillColor("#4c6478").fontSize(8.5).text(item.descripcion, BOX_X + 12, y, {
        width: BOX_ANCHO - 12,
      });
      y = doc.y;
    }
    y += 8;
  });

  if (plan.notas) {
    doc.font("Body-Bold").fillColor("#15304a").fontSize(8).text("Notas", BOX_X, y, { width: BOX_ANCHO });
    doc.font("Body").fillColor("#4c6478").fontSize(9).text(plan.notas, BOX_X, doc.y, { width: BOX_ANCHO });
  }

  dibujarPieContacto(doc, membrete, BOX_Y + BOX_ALTURA + 16);
}
