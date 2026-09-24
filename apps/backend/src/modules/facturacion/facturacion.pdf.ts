import { Prisma } from "@prisma/client";
import { dibujarMembrete, Membrete } from "../../lib/pdf";

type FacturaParaPdf = Prisma.FacturaGetPayload<{
  include: {
    paciente: true;
    aseguradora: true;
    autorizacion: true;
    detalles: true;
    pagos: true;
  };
}> & { pagado: Prisma.Decimal; saldo: Prisma.Decimal };

const INK = "#15304a";
const GRIS = "#4c6478";
const GRIS_CLARO = "#dbe7ee";
const SAGE = "#7c8c81";
const PINK_DEEP = "#c05468";

const METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  SEGURO: "Seguro",
  TRANSFERENCIA: "Transferencia",
};

const monto = (d: Prisma.Decimal) =>
  `$${Number(d).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Columnas de la tabla de servicios (x de inicio y ancho), en puntos.
const COL = {
  descripcion: { x: 50, w: 270 },
  cantidad: { x: 320, w: 50 },
  precio: { x: 370, w: 90 },
  subtotal: { x: 460, w: 102 },
};

function lineaHorizontal(doc: PDFKit.PDFDocument, y: number) {
  doc.strokeColor(GRIS_CLARO).lineWidth(1).moveTo(50, y).lineTo(562, y).stroke();
}

function filaTotal(doc: PDFKit.PDFDocument, etiqueta: string, valor: string, destacado = false) {
  const y = doc.y;
  doc
    .font(destacado ? "Body-Bold" : "Body")
    .fontSize(destacado ? 10.5 : 9.5)
    .fillColor(destacado ? INK : GRIS)
    .text(etiqueta, 330, y, { width: 130, align: "right" });
  doc.text(valor, COL.subtotal.x, y, { width: COL.subtotal.w, align: "right" });
  doc.moveDown(0.25);
}

// Factura/recibo del consultorio en tamaño carta. Es un comprobante de
// control interno: la factura fiscal (SENIAT) se sigue emitiendo aparte.
export function generarFacturaPdf(doc: PDFKit.PDFDocument, factura: FacturaParaPdf, membrete: Membrete) {
  const titulo = factura.estado === "ANULADA" ? "Factura (ANULADA)" : "Factura";
  dibujarMembrete(doc, membrete, titulo, factura.numeroFactura, factura.fecha);

  // Datos del paciente y del convenio
  const yDatos = doc.y;
  doc.font("Body-Bold").fontSize(8).fillColor(GRIS).text("PACIENTE", 50, yDatos);
  doc
    .font("Body-Semi")
    .fontSize(10)
    .fillColor(INK)
    .text(`${factura.paciente.nombres} ${factura.paciente.apellidos}`, 50, doc.y + 2);
  doc.font("Body").fontSize(9).fillColor(GRIS).text(`C.I. ${factura.paciente.documento}`);
  if (factura.paciente.telefono) doc.text(`Tel. ${factura.paciente.telefono}`);
  const yFinPaciente = doc.y;

  if (factura.aseguradora) {
    doc.font("Body-Bold").fontSize(8).fillColor(GRIS).text("ASEGURADORA", 330, yDatos);
    doc.font("Body-Semi").fontSize(10).fillColor(INK).text(factura.aseguradora.nombre, 330, doc.y + 2);
    if (factura.autorizacion?.numeroAutorizacion) {
      doc
        .font("Body")
        .fontSize(9)
        .fillColor(GRIS)
        .text(`Autorización N° ${factura.autorizacion.numeroAutorizacion}`, 330);
    }
  }
  doc.y = Math.max(yFinPaciente, doc.y) + 16;

  // Tabla de servicios
  const yCabecera = doc.y;
  doc.font("Body-Bold").fontSize(8).fillColor(GRIS);
  doc.text("SERVICIO", COL.descripcion.x, yCabecera, { width: COL.descripcion.w });
  doc.text("CANT.", COL.cantidad.x, yCabecera, { width: COL.cantidad.w, align: "center" });
  doc.text("PRECIO UNIT.", COL.precio.x, yCabecera, { width: COL.precio.w, align: "right" });
  doc.text("SUBTOTAL", COL.subtotal.x, yCabecera, { width: COL.subtotal.w, align: "right" });
  lineaHorizontal(doc, yCabecera + 14);
  doc.y = yCabecera + 22;

  for (const d of factura.detalles) {
    const y = doc.y;
    doc.font("Body").fontSize(9.5).fillColor(INK);
    doc.text(d.descripcion ?? "Servicio", COL.descripcion.x, y, { width: COL.descripcion.w });
    const yFinDescripcion = doc.y;
    doc.text(String(d.cantidad), COL.cantidad.x, y, { width: COL.cantidad.w, align: "center" });
    doc.text(monto(d.precioUnitario), COL.precio.x, y, { width: COL.precio.w, align: "right" });
    doc.text(monto(d.subtotal), COL.subtotal.x, y, { width: COL.subtotal.w, align: "right" });
    doc.y = yFinDescripcion + 6;
  }
  lineaHorizontal(doc, doc.y);
  doc.moveDown(0.8);

  // Totales
  filaTotal(doc, "Subtotal", monto(factura.subtotal));
  if (!factura.impuestos.isZero()) filaTotal(doc, "Impuestos", monto(factura.impuestos));
  filaTotal(doc, "Total", monto(factura.total), true);
  if (factura.montoAseguradora !== null) {
    filaTotal(doc, "Cubre la aseguradora", monto(factura.montoAseguradora));
    filaTotal(doc, "A cargo del paciente", monto(factura.montoPaciente));
  }
  doc.moveDown(0.6);

  // Pagos (los anulados se listan tachados para dejar rastro)
  if (factura.pagos.length > 0) {
    doc.font("Body-Bold").fontSize(8).fillColor(GRIS).text("PAGOS RECIBIDOS", 50);
    doc.moveDown(0.3);
    for (const p of factura.pagos) {
      const y = doc.y;
      const texto =
        `${p.fecha.toLocaleDateString("es-VE")}  ·  ${METODO[p.metodoPago] ?? p.metodoPago}` +
        (p.referencia ? `  ·  Ref. ${p.referencia}` : "") +
        (p.anulado ? "  ·  ANULADO" : "");
      doc
        .font("Body")
        .fontSize(9)
        .fillColor(p.anulado ? PINK_DEEP : INK)
        .text(texto, 50, y, { width: 400, strike: p.anulado });
      doc.text(monto(p.monto), COL.subtotal.x, y, {
        width: COL.subtotal.w,
        align: "right",
        strike: p.anulado,
      });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.4);
    filaTotal(doc, "Total pagado", monto(factura.pagado));
  }
  if (factura.estado !== "ANULADA") filaTotal(doc, "Saldo pendiente", monto(factura.saldo), true);

  if (factura.notas) {
    doc.moveDown(0.8);
    doc.font("Body-Bold").fontSize(8).fillColor(GRIS).text("NOTAS", 50);
    doc.font("Body").fontSize(9).fillColor(INK).text(factura.notas, 50, doc.y + 2, { width: 512 });
  }

  // Pie: datos fiscales/contacto del consultorio + aclaratoria
  const yPie = doc.page.height - doc.page.margins.bottom - 40;
  if (doc.y > yPie - 10) doc.addPage();
  lineaHorizontal(doc, yPie);
  const contacto = [
    membrete.rif ? `RIF ${membrete.rif}` : null,
    membrete.direccionConsultorio,
    membrete.telefonoConsultorio,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.font("Body").fontSize(8).fillColor(SAGE).text(contacto, 50, yPie + 8, { width: 512, align: "center" });
  doc
    .fontSize(7)
    .fillColor(GRIS)
    .text("Comprobante de control interno del consultorio. No sustituye la factura fiscal.", 50, doc.y + 2, {
      width: 512,
      align: "center",
    });
}
