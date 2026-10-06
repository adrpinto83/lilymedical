import { describe, it, expect } from "vitest";
import { borradorInforme } from "./InformeMedicoFormModal";
import type { HistoriaClinica, Paciente } from "../../types";

describe("borradorInforme", () => {
  it("arma la frase inicial con sexo, edad e IDX, y toma el plan de la historia", () => {
    const hace65 = new Date();
    hace65.setFullYear(hace65.getFullYear() - 65, 0, 1);
    const b = borradorInforme(
      { sexo: "MASCULINO", fechaNacimiento: hace65.toISOString() } as Paciente,
      { diagnosticoPrincipal: "POT de artroscopia de hombro derecho", planTerapeutico: "Continuar con fisioterapia" } as HistoriaClinica
    );
    expect(b.informe).toBe(
      "Se trata de paciente masculino de 65 años de edad, quien acude con IDX: POT de artroscopia de hombro derecho."
    );
    expect(b.indicaciones).toBe("Continuar con fisioterapia");
  });

  it("sin historia deja el IDX para completar", () => {
    const b = borradorInforme({ sexo: "FEMENINO", fechaNacimiento: "1990-06-15" } as Paciente, null);
    expect(b.informe).toMatch(/^Se trata de paciente femenino de \d+ años de edad, quien acude con IDX: \.\.\.\.$/);
  });
});
