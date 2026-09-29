import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../lib/prisma", () => {
  const cliente: any = {
    paciente: { findUnique: vi.fn() },
    tarifa: { findMany: vi.fn() },
    aseguradora: { findUnique: vi.fn() },
    pacienteAseguradora: { findFirst: vi.fn() },
    autorizacionSeguro: { findMany: vi.fn() },
    factura: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    cita: { findMany: vi.fn() },
    pago: { create: vi.fn(), update: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  // Las transacciones interactivas reciben el mismo cliente simulado.
  cliente.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(cliente));
  return { prisma: cliente };
});

vi.mock("../../lib/correlativos", () => ({
  siguienteNumero: vi.fn().mockResolvedValue("LM-2026-00001"),
}));

import { prisma } from "../../lib/prisma";
import {
  calcularSplitFactura,
  estadoSegunPagos,
  crearFactura,
  registrarPago,
  anularPago,
  anularFactura,
} from "./facturacion.service";

const D = (v: string | number) => new Prisma.Decimal(v);
const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([]);
});

describe("calcularSplitFactura", () => {
  it("una factura particular queda completa a cargo del paciente", () => {
    const r = calcularSplitFactura(D(100), null, 1);
    expect(r.montoAseguradora).toBeNull();
    expect(r.montoPaciente.toString()).toBe("100");
  });

  it("aplica el % de cobertura", () => {
    const r = calcularSplitFactura(D(100), { porcentajeCobertura: 80, topeMontoPorSesion: null }, 1);
    expect(r.montoAseguradora!.toString()).toBe("80");
    expect(r.montoPaciente.toString()).toBe("20");
  });

  it("sin % configurado la aseguradora cubre el total", () => {
    const r = calcularSplitFactura(D(100), { porcentajeCobertura: null, topeMontoPorSesion: null }, 1);
    expect(r.montoAseguradora!.toString()).toBe("100");
    expect(r.montoPaciente.toString()).toBe("0");
  });

  it("respeta el tope por sesión multiplicado por las unidades", () => {
    // 10 sesiones de $30 al 80% = $240, pero el tope es $20 por sesión = $200
    const r = calcularSplitFactura(D(300), { porcentajeCobertura: 80, topeMontoPorSesion: D(20) }, 10);
    expect(r.montoAseguradora!.toString()).toBe("200");
    expect(r.montoPaciente.toString()).toBe("100");
  });

  it("el tope no aplica cuando la cobertura ya es menor", () => {
    const r = calcularSplitFactura(D(100), { porcentajeCobertura: 50, topeMontoPorSesion: D(80) }, 1);
    expect(r.montoAseguradora!.toString()).toBe("50");
  });

  it("redondea la cobertura a céntimos", () => {
    const r = calcularSplitFactura(D("33.33"), { porcentajeCobertura: 33, topeMontoPorSesion: null }, 1);
    expect(r.montoAseguradora!.toString()).toBe("11");
    expect(r.montoPaciente.toString()).toBe("22.33");
  });
});

describe("estadoSegunPagos", () => {
  it("clasifica pendiente, parcial y pagada", () => {
    expect(estadoSegunPagos(D(100), D(0))).toBe("PENDIENTE");
    expect(estadoSegunPagos(D(100), D(40))).toBe("PARCIAL");
    expect(estadoSegunPagos(D(100), D(100))).toBe("PAGADA");
  });
});

describe("crearFactura", () => {
  const paciente = { id: "p1", activo: true };
  const tarifa = { id: "t1", nombreServicio: "Terapia física", precio: D(30), activo: true };
  const aseguradoraConAutorizacion = {
    id: "a1",
    nombre: "PDVSA-HCM",
    activo: true,
    porcentajeCobertura: 100,
    topeMontoPorSesion: null,
    requiereAutorizacion: true,
  };
  const base = {
    pacienteId: "p1",
    impuestos: 0,
    detalles: [{ tarifaId: "t1", cantidad: 3 }],
  };

  beforeEach(() => {
    db.paciente.findUnique.mockResolvedValue(paciente);
    db.tarifa.findMany.mockResolvedValue([tarifa]);
    db.factura.create.mockImplementation((args: any) => args);
  });

  it("guarda el reparto y el número correlativo en la factura particular", async () => {
    const { data } = await crearFactura(base);
    expect(data.numeroFactura).toBe("LM-2026-00001");
    expect(data.total.toString()).toBe("90");
    expect(data.montoAseguradora).toBeNull();
    expect(data.montoPaciente.toString()).toBe("90");
  });

  it("no factura dos veces la misma cita", async () => {
    db.cita.findMany.mockResolvedValue([
      {
        id: "c1",
        pacienteId: "p1",
        fechaHoraInicio: new Date(2026, 8, 20, 10),
        facturaDetalles: [{ factura: { numeroFactura: "LM-2026-00007" } }],
      },
    ]);
    await expect(
      crearFactura({ ...base, detalles: [{ tarifaId: "t1", cantidad: 1, citaId: "c1" }] })
    ).rejects.toThrow(/ya está en la factura LM-2026-00007/);
    expect(db.factura.create).not.toHaveBeenCalled();
  });

  it("rechaza citas de otro paciente", async () => {
    db.cita.findMany.mockResolvedValue([
      { id: "c1", pacienteId: "otro", fechaHoraInicio: new Date(), facturaDetalles: [] },
    ]);
    await expect(
      crearFactura({ ...base, detalles: [{ tarifaId: "t1", cantidad: 1, citaId: "c1" }] })
    ).rejects.toThrow(/otro paciente/);
  });

  it("rechaza pacientes inactivos", async () => {
    db.paciente.findUnique.mockResolvedValue({ ...paciente, activo: false });
    await expect(crearFactura(base)).rejects.toThrow(/inactivo/);
  });

  it("rechaza tarifas desactivadas", async () => {
    db.tarifa.findMany.mockResolvedValue([{ ...tarifa, activo: false }]);
    await expect(crearFactura(base)).rejects.toThrow(/desactivada/);
  });

  it("exige que el paciente tenga la aseguradora registrada", async () => {
    db.aseguradora.findUnique.mockResolvedValue({ ...aseguradoraConAutorizacion, requiereAutorizacion: false });
    db.pacienteAseguradora.findFirst.mockResolvedValue(null);
    await expect(crearFactura({ ...base, aseguradoraId: "a1" })).rejects.toThrow(/registrada como seguro/);
  });

  describe("con aseguradora que exige autorización", () => {
    beforeEach(() => {
      db.aseguradora.findUnique.mockResolvedValue(aseguradoraConAutorizacion);
      db.pacienteAseguradora.findFirst.mockResolvedValue({ id: "rel1" });
    });

    it("rechaza la factura si no hay autorización aprobada y vigente", async () => {
      db.autorizacionSeguro.findMany.mockResolvedValue([]);
      await expect(crearFactura({ ...base, aseguradoraId: "a1" })).rejects.toThrow(/autorización previa/);
    });

    it("rechaza si las sesiones autorizadas no alcanzan", async () => {
      db.autorizacionSeguro.findMany.mockResolvedValue([
        { id: "au1", sesionesAutorizadas: 10, facturas: [{ detalles: [{ cantidad: 8 }] }] },
      ]);
      await expect(crearFactura({ ...base, aseguradoraId: "a1" })).rejects.toThrow(/quedan 2 .* facturar 3/);
    });

    it("vincula la primera autorización con cupo suficiente", async () => {
      db.autorizacionSeguro.findMany.mockResolvedValue([
        { id: "au1", sesionesAutorizadas: 10, facturas: [{ detalles: [{ cantidad: 9 }] }] },
        { id: "au2", sesionesAutorizadas: 5, facturas: [] },
      ]);
      const { data } = await crearFactura({ ...base, aseguradoraId: "a1" });
      expect(data.autorizacionId).toBe("au2");
      expect(data.montoAseguradora.toString()).toBe("90");
    });

    it("una autorización sin límite de sesiones siempre tiene cupo", async () => {
      db.autorizacionSeguro.findMany.mockResolvedValue([
        { id: "au1", sesionesAutorizadas: null, facturas: [{ detalles: [{ cantidad: 50 }] }] },
      ]);
      const { data } = await crearFactura({ ...base, aseguradoraId: "a1" });
      expect(data.autorizacionId).toBe("au1");
    });
  });
});

describe("pagos", () => {
  const factura = (pagos: any[], estado = "PENDIENTE") => ({ id: "f1", total: D(100), estado, pagos });

  it("rechaza un pago que supera el saldo, sin contar pagos anulados", async () => {
    db.factura.findUnique.mockResolvedValue(
      factura([
        { id: "pg1", monto: D(60), anulado: false },
        { id: "pg2", monto: D(40), anulado: true },
      ])
    );
    await expect(
      registrarPago("f1", "u1", { monto: 50, metodoPago: "EFECTIVO" })
    ).rejects.toThrow(/excede el saldo/);

    db.pago.create.mockResolvedValue({ id: "pg3" });
    await registrarPago("f1", "u1", { monto: 40, metodoPago: "EFECTIVO" });
    expect(db.factura.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { estado: "PAGADA" } });
  });

  it("un pago en bolívares se convierte a dólares con la tasa y guarda lo recibido", async () => {
    db.factura.findUnique.mockResolvedValue(factura([]));
    db.pago.create.mockResolvedValue({ id: "pg1" });
    await registrarPago("f1", "u1", { metodoPago: "PAGO_MOVIL", montoBs: 1825, tasaCambio: 36.5 });
    const { data } = db.pago.create.mock.calls[0][0];
    expect(data.monto.toString()).toBe("50");
    expect(data.montoBs).toBe(1825);
    expect(data.tasaCambio).toBe(36.5);
    expect(db.factura.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { estado: "PARCIAL" } });
  });

  it("bloquea la fila de la factura antes de validar el saldo", async () => {
    db.factura.findUnique.mockResolvedValue(factura([]));
    db.pago.create.mockResolvedValue({ id: "pg1" });
    await registrarPago("f1", "u1", { monto: 10, metodoPago: "EFECTIVO" });
    const sql = db.$queryRaw.mock.calls[0][0].join("?");
    expect(sql).toMatch(/FOR UPDATE/);
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.factura.findUnique.mock.invocationCallOrder[0]
    );
  });

  it("anular un pago recalcula el estado de la factura", async () => {
    db.factura.findUnique.mockResolvedValue(
      factura(
        [
          { id: "pg1", monto: D(60), anulado: false },
          { id: "pg2", monto: D(40), anulado: false },
        ],
        "PAGADA"
      )
    );
    await anularPago("f1", "pg2", "u1", { motivo: "Monto mal digitado" });
    expect(db.pago.update).toHaveBeenCalledWith({
      where: { id: "pg2" },
      data: expect.objectContaining({ anulado: true, anuladoPorId: "u1", motivoAnulacion: "Monto mal digitado" }),
    });
    expect(db.factura.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { estado: "PARCIAL" } });
  });

  it("no anula dos veces el mismo pago", async () => {
    db.factura.findUnique.mockResolvedValue(factura([{ id: "pg1", monto: D(60), anulado: true }]));
    await expect(anularPago("f1", "pg1", "u1", { motivo: "x".repeat(5) })).rejects.toThrow(/ya está anulado/);
  });

  it("no anula una factura con pagos vigentes", async () => {
    db.factura.findUnique.mockResolvedValue(factura([{ id: "pg1", monto: D(30), anulado: false }], "PARCIAL"));
    await expect(anularFactura("f1")).rejects.toThrow(/Anula primero esos pagos/);
    expect(db.factura.update).not.toHaveBeenCalled();
  });

  it("anula la factura cuando todos sus pagos están anulados", async () => {
    db.factura.findUnique.mockResolvedValue(factura([{ id: "pg1", monto: D(30), anulado: true }]));
    await anularFactura("f1");
    expect(db.factura.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { estado: "ANULADA" } });
  });
});
