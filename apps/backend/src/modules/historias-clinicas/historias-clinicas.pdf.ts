import fs from "fs";
import { Adjunto, EvaluacionFisiatrica, HistoriaClinica, Paciente, Sesion } from "@prisma/client";
import { dibujarMembrete, dibujarPiePagina, Membrete } from "../../lib/pdf";
import { rutaAbsolutaAdjunto } from "../../lib/uploads";

type HistoriaConDetalle = HistoriaClinica & {
  paciente: Paciente;
  evaluaciones: (EvaluacionFisiatrica & { evaluador: { nombre: string; apellido: string } })[];
  sesiones: (Sesion & { terapeuta: { nombre: string; apellido: string } })[];
  adjuntos?: Adjunto[];
};

export interface OpcionesPdfHistoria {
  desde?: Date;
  hasta?: Date;
}

const SAGE = "#7c8c81";
const GRIS = "#4c6478";
const INK = "#15304a";
const GRIS_CLARO = "#dbe7ee";
const PINK_DEEP = "#c05468";

const CHART_X = 50;
const CHART_W = 512;
const CHART_H = 100;

// Grafica una serie de puntajes en el tiempo (EVA, Barthel, ROM/goniometría,
// etc.) como línea simple con ejes, dibujada a mano con primitivas de
// pdfkit para no depender de una librería de canvas nativa.
function dibujarGraficoLineal(
  doc: PDFKit.PDFDocument,
  titulo: string,
  puntos: { fecha: Date; valor: number }[]
) {
  if (doc.y + CHART_H + 40 > 730) doc.addPage();

  doc.font("Body-Bold").fillColor(INK).fontSize(9.5).text(titulo);
  doc.moveDown(0.3);

  const top = doc.y;
  const min = Math.min(...puntos.map((p) => p.valor));
  const max = Math.max(...puntos.map((p) => p.valor));
  // Padding del 10% (o ±1 si todos los valores son iguales) para que los
  // puntos extremos no queden pegados al borde del gráfico.
  const pad = max === min ? 1 : (max - min) * 0.1;
  const escalaMin = min - pad;
  const escalaMax = max + pad;

  const plotX = (i: number) => CHART_X + (puntos.length === 1 ? CHART_W / 2 : (i * CHART_W) / (puntos.length - 1));
  const plotY = (v: number) => top + CHART_H - ((v - escalaMin) / (escalaMax - escalaMin)) * CHART_H;

  // Líneas de referencia horizontales (mínimo/promedio/máximo)
  doc.strokeColor(GRIS_CLARO).lineWidth(0.5);
  [0, 0.5, 1].forEach((frac) => {
    const y = top + CHART_H - frac * CHART_H;
    doc.moveTo(CHART_X, y).lineTo(CHART_X + CHART_W, y).stroke();
  });

  // Línea que conecta los puntos
  doc.strokeColor(SAGE).lineWidth(1.5);
  puntos.forEach((p, i) => {
    const x = plotX(i);
    const y = plotY(p.valor);
    if (i === 0) doc.moveTo(x, y);
    else doc.lineTo(x, y);
  });
  doc.stroke();

  // Puntos + etiquetas de valor y fecha
  puntos.forEach((p, i) => {
    const x = plotX(i);
    const y = plotY(p.valor);
    doc.circle(x, y, 2.5).fillColor(PINK_DEEP).fill();
    doc
      .font("Body-Bold")
      .fillColor(INK)
      .fontSize(7)
      .text(String(p.valor), x - 10, y - 13, { width: 20, align: "center" });
    doc
      .font("Body")
      .fillColor(GRIS)
      .fontSize(6.5)
      .text(p.fecha.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" }), x - 15, top + CHART_H + 4, {
        width: 30,
        align: "center",
      });
  });

  doc.y = top + CHART_H + 18;
  doc.x = CHART_X;
}

const ESCALA_LABEL: Record<string, string> = {
  BARTHEL: "Índice de Barthel",
  OSWESTRY: "Índice de Oswestry",
  GONIOMETRICA: "Evaluación goniométrica",
  EVA: "Escala Visual Análoga (dolor)",
  FUERZA_MUSCULAR: "Fuerza muscular",
  PERSONALIZADA: "Escala personalizada",
};

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
  membrete: Membrete,
  opciones: OpcionesPdfHistoria = {}
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
  if (opciones.desde || opciones.hasta) {
    doc
      .font("Body-Italic")
      .fillColor(SAGE)
      .fontSize(8.5)
      .text(
        `Período exportado: ${opciones.desde ? opciones.desde.toLocaleDateString("es-VE") : "inicio"} — ${
          opciones.hasta ? opciones.hasta.toLocaleDateString("es-VE") : "hoy"
        }`
      );
  }
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

  // Agrupa evaluaciones con puntaje numérico por escala (EVA, Barthel,
  // goniometría/ROM, etc.) para graficar su evolución en el tiempo.
  const gruposEvolucion = new Map<string, { titulo: string; puntos: { fecha: Date; valor: number }[] }>();
  for (const ev of historia.evaluaciones) {
    if (ev.puntajeTotal === null || ev.puntajeTotal === undefined) continue;
    const clave = ev.tipoEscala === "PERSONALIZADA" ? `PERSONALIZADA:${ev.nombreEscala}` : ev.tipoEscala;
    const titulo = ev.tipoEscala === "PERSONALIZADA" ? ev.nombreEscala || "Escala personalizada" : ESCALA_LABEL[ev.tipoEscala] ?? ev.tipoEscala;
    if (!gruposEvolucion.has(clave)) gruposEvolucion.set(clave, { titulo, puntos: [] });
    gruposEvolucion.get(clave)!.puntos.push({ fecha: ev.fecha, valor: ev.puntajeTotal });
  }
  const gruposConEvolucion = [...gruposEvolucion.values()].filter((g) => g.puntos.length >= 2);

  if (gruposConEvolucion.length > 0) {
    seccion(doc, "Gráfico de evolución");
    for (const grupo of gruposConEvolucion) {
      dibujarGraficoLineal(doc, grupo.titulo, grupo.puntos);
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

  if (historia.adjuntos && historia.adjuntos.length > 0) {
    doc.addPage();
    seccion(doc, "Imágenes y estudios");
    for (const adjunto of historia.adjuntos) {
      const rutaCompleta = rutaAbsolutaAdjunto(adjunto.rutaArchivo);
      if (!fs.existsSync(rutaCompleta)) continue;

      if (doc.y > 250) doc.addPage();
      doc
        .font("Body-Bold")
        .fillColor(INK)
        .fontSize(9.5)
        .text(`${adjunto.categoria || "Estudio"} · ${adjunto.createdAt.toLocaleDateString("es-VE")}`);
      if (adjunto.descripcion) {
        doc.font("Body").fillColor(GRIS).fontSize(9).text(adjunto.descripcion);
      }
      doc.moveDown(0.4);
      try {
        // fit dentro del ancho útil y el espacio restante de la página,
        // preservando el aspecto de la imagen original.
        const espacioDisponible = doc.page.height - doc.page.margins.bottom - doc.y;
        doc.image(rutaCompleta, {
          fit: [512, Math.max(200, espacioDisponible - 20)],
        });
      } catch {
        doc.font("Body-Italic").fillColor(GRIS).fontSize(8.5).text("(no se pudo incrustar la imagen)");
      }
      doc.moveDown(1);
    }
  }

  doc.moveDown(1.5);
  await dibujarPiePagina(doc, membrete);
}
