import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { HistoriaClinicaPanel } from "./HistoriaClinicaPanel";
import * as historias from "../../services/historiasClinicas";
import * as sesiones from "../../services/sesiones";
import * as citas from "../../services/citas";
import type { HistoriaClinica, Sesion } from "../../types";

vi.mock("../../services/historiasClinicas");
vi.mock("../../services/sesiones");
vi.mock("../../services/citas");

// jsdom no trae ResizeObserver (lo usa la gráfica de evolución).
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

function sesion(id: string, fecha: string, evaPre: number, evaPost: number): Sesion {
  return {
    id,
    historiaClinicaId: "h1",
    fecha,
    notaEvolucion: `Nota ${id}`,
    asistencia: "ASISTIO",
    evaPre,
    evaPost,
    modalidades: ["TENS", "Ultrasonido"],
    terapeuta: { nombre: "Ana", apellido: "Pérez" },
  };
}

const historia: HistoriaClinica = {
  id: "h1",
  pacienteId: "p1",
  diagnosticoPrincipal: "Lumbalgia mecánica",
  codigoCIE10: "M54.5",
  contraindicaciones: "Marcapasos",
  ocupacion: "Docente",
  dominancia: "DIESTRO",
  sesiones: [sesion("s1", "2026-09-01T10:00:00", 8, 6), sesion("s2", "2026-09-08T10:00:00", 5, 3)],
  evaluaciones: [
    {
      id: "e1",
      historiaClinicaId: "h1",
      fecha: "2026-09-01T09:00:00",
      tipoEscala: "BARTHEL",
      datos: { interpretacion: "Dependencia moderada", items: { comer: 10 } },
      puntajeTotal: 75,
    },
  ],
  adjuntos: [],
};

beforeEach(() => {
  vi.mocked(historias.obtenerHistoriaPorPaciente).mockResolvedValue(historia);
  vi.mocked(historias.agregarEvaluacion).mockResolvedValue({} as never);
  vi.mocked(citas.listarCitas).mockResolvedValue([]);
  vi.mocked(sesiones.crearSesion).mockResolvedValue({} as never);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("HistoriaClinicaPanel", () => {
  it("muestra alertas, resumen, gráfica de EVA y el detalle de las sesiones", async () => {
    render(<HistoriaClinicaPanel pacienteId="p1" puedeEditar />);
    expect(await screen.findByText(/Contraindicaciones para agentes físicos/)).toBeTruthy();
    expect(screen.getByText("3/10")).toBeTruthy(); // último dolor: EVA al salir de la última sesión
    expect(screen.getByText("Dolor por sesión (EVA)")).toBeTruthy();
    expect(screen.getAllByText("TENS").length).toBeGreaterThan(0);
    expect(screen.getByText(/Dependencia moderada/)).toBeTruthy();
  });

  it("calcula el Barthel y lo guarda con su interpretación", async () => {
    render(<HistoriaClinicaPanel pacienteId="p1" puedeEditar />);
    fireEvent.click(await screen.findByText("Evaluación / escala"));
    fireEvent.change(screen.getByLabelText("Escala"), { target: { value: "BARTHEL" } });
    // Primera opción (máximo) de cada ítem
    for (const nombre of ["comer", "banarse", "vestirse", "arreglarse", "deposiciones", "miccion", "retrete", "traslado", "deambulacion", "escaleras"]) {
      fireEvent.click(document.querySelector(`input[name="${nombre}"]`)!);
    }
    expect(screen.getByText(/100\/100 · Independiente/)).toBeTruthy();
    fireEvent.click(screen.getByText("Guardar evaluación"));
    await waitFor(() =>
      expect(historias.agregarEvaluacion).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          tipoEscala: "BARTHEL",
          puntajeTotal: 100,
          datos: expect.objectContaining({ interpretacion: "Independiente" }),
        })
      )
    );
  });

  it("el ayudante registra sesiones pero no edita ni evalúa", async () => {
    render(<HistoriaClinicaPanel pacienteId="p1" puedeEditar={false} />);
    await screen.findByText("Registrar sesión");
    expect(screen.queryByText("Evaluación / escala")).toBeNull();
    expect(screen.queryByText("Editar")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "7" })[0]); // EVA al llegar
    fireEvent.click(screen.getByRole("button", { name: "Crioterapia" }));
    fireEvent.change(screen.getByLabelText("Nota de evolución"), { target: { value: "Mejor movilidad" } });
    fireEvent.click(screen.getByText("Registrar sesión"));
    await waitFor(() =>
      expect(sesiones.crearSesion).toHaveBeenCalledWith(
        expect.objectContaining({ evaPre: 7, evaPost: null, modalidades: ["Crioterapia"], notaEvolucion: "Mejor movilidad" })
      )
    );
  });
});
