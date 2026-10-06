import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    correlativo: { findUnique: vi.fn(), upsert: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  },
}));

import { prisma } from "./prisma";
import { fijarSiguienteNumero, listarNumeracion } from "./correlativos";

const anio = new Date().getFullYear();
const mock = prisma as unknown as {
  correlativo: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.correlativo.findUnique.mockResolvedValue(null);
  mock.$queryRawUnsafe.mockResolvedValue([{ numero: null }]);
});

describe("numeración de documentos", () => {
  it("sin documentos emitidos, el próximo es el 1", async () => {
    const series = await listarNumeracion();
    expect(series.map((s) => s.prefijo)).toEqual(["PR", "LM", "RX", "IM", "CM"]);
    expect(series[0]).toMatchObject({ nombre: "Presupuestos", serie: `PR-${anio}`, siguiente: 1, minimo: 1 });
  });

  it("deja seguir la numeración del talonario: el próximo presupuesto sale con el 55", async () => {
    mock.correlativo.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ serie: `PR-${anio}`, valor: 54 });
    const estado = await fijarSiguienteNumero("PR", 55);
    expect(mock.correlativo.upsert).toHaveBeenCalledWith({
      where: { serie: `PR-${anio}` },
      create: { serie: `PR-${anio}`, valor: 54 },
      update: { valor: 54 },
    });
    expect(estado.siguiente).toBe(55);
  });

  it("no deja volver a un número ya emitido", async () => {
    mock.$queryRawUnsafe.mockResolvedValue([{ numero: `PR-${anio}-00012` }]);
    await expect(fijarSiguienteNumero("PR", 10)).rejects.toThrow("entre 13 y 99999");
    expect(mock.correlativo.upsert).not.toHaveBeenCalled();
    // El 13 sí: es justo el siguiente al último emitido.
    await fijarSiguienteNumero("PR", 13);
    expect(mock.correlativo.upsert).toHaveBeenCalled();
  });

  it("rechaza series desconocidas y números inválidos", async () => {
    await expect(fijarSiguienteNumero("XX", 5)).rejects.toThrow("desconocida");
    await expect(fijarSiguienteNumero("PR", 1.5)).rejects.toThrow();
    await expect(fijarSiguienteNumero("PR", 100000)).rejects.toThrow();
  });
});
