import { Prisma } from "@prisma/client";
import { dibujarCabeceraMarca, dibujarPiePagina, fechaConsultorio, Membrete } from "../../lib/pdf";

type PresupuestoCompleto = Prisma.PresupuestoGetPayload<{ include: { paciente: true; items: true } }>;

const INK = "#15304a";
const GRIS = "#4c6478";
const BORDE = "#9fb3c2";
const FONDO_CABECERA = "#eef3f6";

const X = 50;
const ANCHO = 512;
const LIMITE_TABLA = 640;

const numero = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const redondear2 = (n: number) => Math.round(n * 100) / 100;

interface Columna {
  titulo: string;
  ancho: number;
  align: "left" | "center" | "right";
}

/**
 * Presupuesto en el formato que ya usa el consultorio: datos del médico,
 * recuadro del paciente con el IDX, tabla en $ y en Bs a la tasa BCV, y la
 * firma. Sin tasa, sale solo en dólares.
 */
export async function generarPresupuestoPdf(
  doc: PDFKit.PDFDocument,
  presupuesto: PresupuestoCompleto,
  membrete: Membrete
) {
  const p = presupuesto.paciente;
  const tasa = presupuesto.tasaCambio ? Number(presupuesto.tasaCambio) : null;

  dibujarCabeceraMarca(doc, membrete);

  // Número y fecha, arriba a la derecha.
  const yCabecera = doc.y + 10;
  doc
    .font("Body-Bold")
    .fontSize(9)
    .fillColor(GRIS)
    .text(`PRESUPUESTO: ${presupuesto.numeroPresupuesto}`, X, yCabecera, { width: ANCHO, align: "right" })
    .text(`FECHA: ${fechaConsultorio(presupuesto.fecha)}`, X, doc.y, { width: ANCHO, align: "right" });

  // Datos del médico.
  const credenciales = [
    membrete.colegiatura ? `MPPS: ${membrete.colegiatura}` : null,
    membrete.cma ? `CMA: ${membrete.cma}` : null,
    membrete.rif ? `RIF: ${membrete.rif}` : null,
  ].filter(Boolean);
  const lineasMedico = [
    `DRA. ${membrete.medicoNombre} ${membrete.medicoApellido}`,
    membrete.tituloProfesional,
    credenciales.join(", "),
    membrete.telefonoConsultorio ? `TLF: ${membrete.telefonoConsultorio}` : null,
    membrete.direccionConsultorio,
  ].filter(Boolean) as string[];
  doc.font("Body").fontSize(10).fillColor(INK);
  doc.y = doc.y + 10;
  for (const linea of lineasMedico) doc.text(linea.toUpperCase(), X, doc.y, { width: ANCHO });

  // Recuadro del paciente.
  const yCaja = doc.y + 16;
  const lineasPaciente = [
    `PACIENTE: ${p.nombres} ${p.apellidos}`,
    `CÉDULA O RIF: ${p.documento}`,
    `TELÉFONO: ${p.telefono}`,
  ];
  doc.font("Body").fontSize(9).fillColor(INK);
  let y = yCaja + 8;
  for (const linea of lineasPaciente) {
    doc.text(linea.toUpperCase(), X + 8, y, { width: ANCHO - 16 });
    y = doc.y;
  }
  if (presupuesto.diagnostico) {
    doc.text(`IDX: ${presupuesto.diagnostico}`.toUpperCase(), X + 8, y + 8, { width: ANCHO - 16 });
    y = doc.y;
  }
  doc.strokeColor(INK).lineWidth(0.8).rect(X, yCaja, ANCHO, y + 8 - yCaja).stroke();

  doc
    .font("Display-Bold")
    .fontSize(15)
    .fillColor(INK)
    .text("PRESUPUESTO", X, y + 28, { width: ANCHO, align: "center" });

  // Tabla.
  const columnas: Columna[] = tasa
    ? [
        { titulo: "CANTIDAD", ancho: 62, align: "center" },
        { titulo: "DESCRIPCIÓN", ancho: 200, align: "center" },
        { titulo: "PRECIO UNITARIO $", ancho: 85, align: "center" },
        { titulo: "TOTAL $", ancho: 70, align: "center" },
        { titulo: "TOTAL Bs BCV", ancho: 95, align: "center" },
      ]
    : [
        { titulo: "CANTIDAD", ancho: 62, align: "center" },
        { titulo: "DESCRIPCIÓN", ancho: 285, align: "center" },
        { titulo: "PRECIO UNITARIO $", ancho: 95, align: "center" },
        { titulo: "TOTAL $", ancho: 70, align: "center" },
      ];

  const fila = (celdas: string[], yFila: number, opciones: { negrita?: boolean; fondo?: string; minAlto?: number } = {}) => {
    doc.font(opciones.negrita ? "Body-Bold" : "Body").fontSize(9);
    const alto = Math.max(
      opciones.minAlto ?? 22,
      ...celdas.map((c, i) => doc.heightOfString(c, { width: columnas[i].ancho - 10 }) + 12)
    );
    let x = X;
    columnas.forEach((col, i) => {
      if (opciones.fondo) doc.rect(x, yFila, col.ancho, alto).fill(opciones.fondo);
      doc.strokeColor(BORDE).lineWidth(0.8).rect(x, yFila, col.ancho, alto).stroke();
      doc
        .fillColor(INK)
        .font(opciones.negrita ? "Body-Bold" : "Body")
        .fontSize(9)
        .text(celdas[i] ?? "", x + 5, yFila + 6, { width: col.ancho - 10, align: col.align });
      x += col.ancho;
    });
    return yFila + alto;
  };
  const cabecera = (yFila: number) =>
    fila(
      columnas.map((c) => c.titulo),
      yFila,
      { negrita: true, fondo: FONDO_CABECERA }
    );

  y = cabecera(doc.y + 14);
  let totalBs = 0;
  for (const item of presupuesto.items) {
    const subtotal = Number(item.subtotal);
    const bs = tasa ? redondear2(subtotal * tasa) : 0;
    totalBs += bs;
    const celdas = [String(item.cantidad), item.descripcion, numero(Number(item.precioUnitario)), numero(subtotal)];
    if (tasa) celdas.push(numero(bs));
    doc.font("Body").fontSize(9);
    const altoFila = doc.heightOfString(item.descripcion, { width: columnas[1].ancho - 10 }) + 12;
    if (y + altoFila > LIMITE_TABLA) {
      doc.addPage();
      y = cabecera(50);
    }
    y = fila(celdas, y, { minAlto: presupuesto.items.length === 1 ? 60 : 22 });
  }

  // Total neto: ocupa las tres primeras columnas.
  const anchoEtiqueta = columnas[0].ancho + columnas[1].ancho + columnas[2].ancho;
  const altoTotal = 20;
  doc.strokeColor(BORDE).lineWidth(0.8).rect(X, y, anchoEtiqueta, altoTotal).stroke();
  doc.font("Body-Bold").fontSize(9.5).fillColor(INK).text("Total neto:", X + 6, y + 5);
  let xTotal = X + anchoEtiqueta;
  const totales = [`$ ${numero(Number(presupuesto.total))}`];
  if (tasa) totales.push(`Bs ${numero(redondear2(totalBs))}`);
  totales.forEach((t, i) => {
    const ancho = columnas[3 + i].ancho;
    doc.strokeColor(BORDE).rect(xTotal, y, ancho, altoTotal).stroke();
    doc.fillColor(INK).text(t, xTotal + 4, y + 5, { width: ancho - 8, align: "center" });
    xTotal += ancho;
  });
  y += altoTotal + 22;

  doc.font("Body").fontSize(10).fillColor(INK);
  if (tasa) {
    doc.text(
      `Presupuesto en bolívares sujeto a cambios según la tasa del día del BCV (Bs ${numero(tasa)} por dólar al ${fechaConsultorio(
        presupuesto.fecha
      )}).`,
      X,
      y,
      { width: ANCHO }
    );
    y = doc.y + 8;
  }
  if (presupuesto.notas) {
    doc.font("Body").fontSize(9.5).fillColor(GRIS).text(presupuesto.notas, X, y, { width: ANCHO, align: "justify" });
  }

  doc.moveDown(1.5);
  await dibujarPiePagina(doc, membrete);
}
