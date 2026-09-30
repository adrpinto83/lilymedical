import { describe, it, expect } from "vitest";
import * as plantillas from "./correos.plantillas";
import { htmlATexto } from "./correos.layout";

const consultorio = {
  nombreMedico: "Dra. Lilia Figuera",
  titulo: "Médico Fisiatra",
  direccion: "Av. Principal, Torre Médica, piso 3",
  telefono: "0414-0000000",
  instagram: "@dralilyfisiatra",
};

// 14:00 UTC = 10:00 a. m. en Caracas (UTC-4)
const inicio = new Date("2026-10-05T14:00:00Z");
const fin = new Date("2026-10-05T14:45:00Z");
const cita = { inicio, fin, profesional: "Dra. Lilia Figuera", servicio: "Terapia física" };

describe("plantillas de correo", () => {
  it("muestra la hora del consultorio (Caracas), no la del servidor", () => {
    const { html, subject } = plantillas.citaAgendada({ nombres: "Ana" }, cita, consultorio);
    expect(subject).toContain("Lunes, 5 de octubre de 2026");
    expect(html).toMatch(/10:00/);
    expect(html).not.toMatch(/14:00/);
  });

  it("escapa los datos del paciente para que no inyecten HTML", () => {
    const { html } = plantillas.citaAgendada({ nombres: '<script>alert("x")</script>' }, cita, consultorio);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("genera también la versión en texto plano, con los enlaces visibles", () => {
    const { text } = plantillas.bienvenidaPaciente({ nombres: "Ana" }, consultorio);
    expect(text).toContain("Hola Ana");
    expect(text).toMatch(/Crear mi cuenta \(http[^)]+\/registro-paciente\)/);
    expect(text).not.toMatch(/<[a-z]/);
  });

  it("el pie lleva los datos de contacto del consultorio", () => {
    const { html } = plantillas.recordatorioCita({ nombres: "Ana" }, cita, consultorio);
    expect(html).toContain("0414-0000000");
    expect(html).toContain("instagram.com/dralilyfisiatra");
  });

  it("muestra el saldo pendiente solo cuando lo hay", () => {
    const base = {
      numero: "F-0001",
      fecha: inicio,
      total: 40,
      montoPaciente: 40,
      pagado: 40,
      saldo: 0,
      detalles: [{ descripcion: "Consulta", cantidad: 1, subtotal: 40 }],
    };
    expect(plantillas.facturaEnviada({ nombres: "Ana" }, base, consultorio).html).not.toContain("Saldo pendiente");
    expect(
      plantillas.facturaEnviada({ nombres: "Ana" }, { ...base, pagado: 10, saldo: 30 }, consultorio).html
    ).toContain("Saldo pendiente");
  });

  it("muestra las fechas de reposo sin correrlas un día", () => {
    const { html } = plantillas.constanciaEnviada(
      { nombres: "Ana" },
      {
        numero: "C-0001",
        fecha: inicio,
        medico: "Dra. Lilia Figuera",
        diasReposo: 3,
        inicioReposo: new Date("2026-10-05T00:00:00Z"),
        finReposo: new Date("2026-10-07T00:00:00Z"),
        codigoVerificacion: "abc",
      },
      consultorio
    );
    expect(html).toContain("del 05/10/2026 al 07/10/2026");
  });
});

describe("archivo de calendario (.ics)", () => {
  it("usa horas UTC y escapa comas y punto y coma", () => {
    const ics = plantillas.archivoIcs({
      uid: "c1",
      titulo: "Cita con Dra. Lilia Figuera",
      inicio,
      fin,
      lugar: "Av. Principal, piso 3; consultorio 2",
    });
    expect(ics).toContain("DTSTART:20261005T140000Z");
    expect(ics).toContain("DTEND:20261005T144500Z");
    expect(ics).toContain("LOCATION:Av. Principal\\, piso 3\\; consultorio 2");
    expect(ics).toContain("METHOD:PUBLISH");
  });

  it("marca la cita como cancelada", () => {
    const ics = plantillas.archivoIcs({ uid: "c1", titulo: "Cita", inicio, fin, cancelada: true });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).not.toContain("VALARM");
  });
});

describe("htmlATexto", () => {
  it("convierte listas y saltos de línea", () => {
    expect(htmlATexto("<ul><li>Uno</li><li>Dos</li></ul><p>Fin&amp;listo</p>")).toBe("• Uno\n• Dos\nFin&listo");
  });
});
