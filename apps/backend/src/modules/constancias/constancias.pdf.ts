import { Prisma } from "@prisma/client";
import {
  dibujarEncabezadoTarjeta,
  dibujarLineaCredenciales,
  dibujarCajaContenido,
  dibujarCamposPaciente,
  dibujarPieContacto,
  Membrete,
} from "../../lib/pdf";

type ConstanciaConPaciente = Prisma.ConstanciaMedicaGetPayload<{
  include: { paciente: true };
}>;

const BOX_Y = 128;
const BOX_ALTURA = 400;
const BOX_X = 34;
const BOX_ANCHO = 328;

// fechaInicioReposo/fechaFinReposo llegan como fecha-sin-hora (medianoche UTC).
// Formatear con los componentes UTC evita que un huso horario negativo
// (ej. América/Caracas, UTC-4) los muestre un día antes del real.
const formatoFechaUTC = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

export async function generarConstanciaPdf(
  doc: PDFKit.PDFDocument,
  constancia: ConstanciaConPaciente,
  membrete: Membrete
) {
  await dibujarEncabezadoTarjeta(doc, membrete, constancia.codigoVerificacion);
  dibujarLineaCredenciales(doc, membrete, 100);
  dibujarCajaContenido(doc, BOX_Y, BOX_ALTURA);

  let y = dibujarCamposPaciente(doc, BOX_Y + 14, constancia.paciente, constancia.fecha);

  doc.fillColor("#7c8c81").font("Display-Semi").fontSize(12).text("Constancia médica", BOX_X, y);
  y = doc.y + 10;

  const edad = Math.floor(
    (Date.now() - constancia.paciente.fechaNacimiento.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  doc.font("Body").fillColor("#15304a").fontSize(9);
  const cuerpo =
    `Quien suscribe, Dra. ${membrete.medicoNombre} ${membrete.medicoApellido}` +
    `${membrete.tituloProfesional ? `, ${membrete.tituloProfesional}` : ""}` +
    `${membrete.colegiatura ? ` (MPPS ${membrete.colegiatura})` : ""}, hace constar que ` +
    `${constancia.paciente.nombres} ${constancia.paciente.apellidos}, titular de la cédula ` +
    `N° ${constancia.paciente.documento}, de ${edad} años de edad, fue evaluado(a) en esta ` +
    `consulta el ${constancia.fecha.toLocaleDateString("es-VE")}.`;
  doc.text(cuerpo, BOX_X, y, { width: BOX_ANCHO, align: "justify", lineGap: 3 });
  y = doc.y + 8;

  if (constancia.diagnostico) {
    doc.font("Body-Bold").fillColor("#15304a").fontSize(8).text("Diagnóstico", BOX_X, y, { width: BOX_ANCHO });
    doc
      .font("Body")
      .fillColor("#4c6478")
      .fontSize(9)
      .text(
        constancia.diagnostico + (constancia.codigoCIE10 ? ` (CIE-10: ${constancia.codigoCIE10})` : ""),
        BOX_X,
        doc.y,
        { width: BOX_ANCHO }
      );
    y = doc.y + 8;
  }

  doc.font("Body-Bold").fillColor("#15304a").fontSize(8).text("Motivo de la constancia", BOX_X, y, {
    width: BOX_ANCHO,
  });
  doc.font("Body").fillColor("#4c6478").fontSize(9).text(constancia.motivo, BOX_X, doc.y, {
    width: BOX_ANCHO,
    align: "justify",
  });
  y = doc.y + 8;

  if (constancia.diasReposo) {
    doc.font("Body-Bold").fillColor("#15304a").fontSize(8).text("Reposo indicado", BOX_X, y, {
      width: BOX_ANCHO,
    });
    const rango =
      constancia.fechaInicioReposo && constancia.fechaFinReposo
        ? ` (del ${formatoFechaUTC(constancia.fechaInicioReposo)} al ${formatoFechaUTC(constancia.fechaFinReposo)})`
        : "";
    doc
      .font("Body")
      .fillColor("#4c6478")
      .fontSize(9)
      .text(`${constancia.diasReposo} día(s)${rango}`, BOX_X, doc.y, { width: BOX_ANCHO });
  }

  dibujarPieContacto(doc, membrete, BOX_Y + BOX_ALTURA + 16);
}
