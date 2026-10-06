import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { generarPdfEnMemoria } from "../../lib/pdf";
import { generarInformeMedicoPdf } from "./informes-medicos.pdf";
import { generarPresupuestoPdf } from "../presupuestos/presupuestos.pdf";

const membrete = { medicoNombre: "Lilia", medicoApellido: "Figuera", tituloProfesional: "Médico Fisiatra", colegiatura: "73766" };
const paciente = {
  nombres: "Julio César",
  apellidos: "Romero",
  documento: "5196083",
  telefono: "0414-0000000",
  fechaNacimiento: new Date("1960-03-01"),
};
const paginas = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

function informe(texto: string) {
  return { fecha: new Date("2026-10-06T14:00:00Z"), paciente, informe: texto, indicaciones: "- Continuar con fisioterapia" } as never;
}

describe("PDF de informe médico", () => {
  it("un informe normal cabe en una hoja", async () => {
    const pdf = await generarPdfEnMemoria("MEDIA_CARTA", (doc) =>
      generarInformeMedicoPdf(doc, informe("Se trata de paciente masculino de 65 años de edad."), membrete)
    );
    expect(paginas(pdf)).toBe(1);
  });

  it("un informe muy largo sigue en otra hoja en vez de salirse de la caja", async () => {
    const largo = Array.from({ length: 400 }, (_, i) => `palabra${i}`).join(" ");
    const pdf = await generarPdfEnMemoria("MEDIA_CARTA", (doc) => generarInformeMedicoPdf(doc, informe(largo), membrete));
    expect(paginas(pdf)).toBeGreaterThan(1);
  });
});

describe("PDF de presupuesto", () => {
  it("se genera con y sin tasa BCV", async () => {
    for (const tasaCambio of [new Prisma.Decimal(832.4883), null]) {
      const pdf = await generarPdfEnMemoria("CARTA", (doc) =>
        generarPresupuestoPdf(
          doc,
          {
            numeroPresupuesto: "PR-2026-00001",
            fecha: new Date(),
            tasaCambio,
            total: new Prisma.Decimal(300),
            diagnostico: "Mallet finger",
            notas: null,
            paciente,
            items: [{ cantidad: 15, descripcion: "Terapia", precioUnitario: new Prisma.Decimal(20), subtotal: new Prisma.Decimal(300) }],
          } as never,
          membrete
        )
      );
      expect(paginas(pdf)).toBe(1);
    }
  });
});
