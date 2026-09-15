import { Prisma } from "@prisma/client";
import { dibujarMembrete, dibujarPiePagina, Membrete } from "../../lib/pdf";

type HistoriaConDetalle = Prisma.HistoriaClinicaGetPayload<{
  include: {
    paciente: true;
    evaluaciones: { include: { evaluador: { select: { nombre: true; apellido: true } } } };
    sesiones: { include: { terapeuta: { select: { nombre: true; apellido: true } } } };
  };
}>;

const ESCALA_LABEL: Record<string, string> = {
  BARTHEL: "Índice de Barthel",
  OSWESTRY: "Índice de Oswestry",
  GONIOMETRICA: "Evaluación goniométrica",
  EVA: "Escala Visual Análoga (dolor)",
  FUERZA_MUSCULAR: "Fuerza muscular",
  PERSONALIZADA: "Escala personalizada",
};

const SAGE = "#7c8c81";
const GRIS = "#4c6478";
const INK = "#15304a";

function calcularEdad(fechaNacimiento: Date) {
  const diff = Date.now() - fechaNacimiento.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function seccion(doc: PDFKit.PDFDocument, titulo: string) {
  if (doc.y > 680) doc.addPage();
  doc.moveDown(0.6);
  doc.font("Display-Semi").fillColor(SAGE).fontSize(12).text(titulo);
  doc
    .strokeColor("#dbe7ee")
    .lineWidth(1)
    .moveTo(50, doc.y + 2)
    .lineTo(562, doc.y + 2)
    .stroke();
  doc.moveDown(0.5);
}

function campo(doc: PDFKit.PDFDocument, etiqueta: string, valor?: string | null) {
  if (!valor) return;
  if (doc.y > 700) doc.addPage();
  doc.font("Body-Bold").fillColor(INK).fontSize(9).text(etiqueta);
  doc.font("Body").fillColor(GRIS).fontSize(9.5).text(valor, { align: "justify" });
  doc.moveDown(0.5);
}

export async function generarHistoriaClinicaPdf(
  doc: PDFKit.PDFDocument,
  historia: HistoriaConDetalle,
  membrete: Membrete
) {
  const p = historia.paciente;
  dibujarMembrete(doc, membrete, "Historia clínica", p.documento, new Date());

  doc
    .font("Body-Bold")
    .fillColor(INK)
    .fontSize(11)
    .text(`${p.apellidos}, ${p.nombres}`);
  doc
    .font("Body")
    .fillColor(GRIS)
    .fontSize(9.5)
    .text(
      `${calcularEdad(p.fechaNacimiento)} años · ${p.sexo} · Doc. ${p.documento} · Tel. ${p.telefono}`
    );
  doc.moveDown(0.8);

  seccion(doc, "Datos clínicos generales");
  campo(doc, "Motivo de consulta", historia.motivoConsulta);
  campo(
    doc,
    "Diagnóstico principal",
    historia.diagnosticoPrincipal
      ? `${historia.diagnosticoPrincipal}${historia.codigoCIE10 ? ` (CIE-10: ${historia.codigoCIE10})` : ""}`
      : null
  );
  campo(doc, "Antecedentes médicos", historia.antecedentesMedicos);
  campo(doc, "Antecedentes quirúrgicos", historia.antecedentesQuirurgicos);
  campo(doc, "Antecedentes familiares", historia.antecedentesFamiliares);

  if (historia.evaluaciones.length > 0) {
    seccion(doc, "Evaluaciones fisiátricas");
    for (const ev of historia.evaluaciones) {
      if (doc.y > 700) doc.addPage();
      doc
        .font("Body-Bold")
        .fillColor(INK)
        .fontSize(9.5)
        .text(
          `${ev.fecha.toLocaleDateString("es-VE")} · ${ESCALA_LABEL[ev.tipoEscala] ?? ev.tipoEscala}` +
            (ev.puntajeTotal !== null ? `: ${ev.puntajeTotal}` : ""),
          { continued: false }
        );
      if (ev.observaciones) {
        doc.font("Body").fillColor(GRIS).fontSize(9).text(ev.observaciones);
      }
      doc.moveDown(0.4);
    }
  }

  if (historia.sesiones.length > 0) {
    seccion(doc, "Notas de evolución por sesión");
    for (const s of historia.sesiones) {
      if (doc.y > 690) doc.addPage();
      doc
        .font("Body-Bold")
        .fillColor(INK)
        .fontSize(9.5)
        .text(
          `${s.fecha.toLocaleDateString("es-VE")} · ${s.terapeuta.nombre} ${s.terapeuta.apellido}`
        );
      doc.font("Body").fillColor(GRIS).fontSize(9).text(s.notaEvolucion, { align: "justify" });
      if (s.tratamientoAplicado) {
        doc
          .font("Body-Italic")
          .fillColor(GRIS)
          .fontSize(8.5)
          .text(`Tratamiento: ${s.tratamientoAplicado}`);
      }
      doc.moveDown(0.5);
    }
  }

  doc.moveDown(1.5);
  await dibujarPiePagina(doc, membrete);
}
