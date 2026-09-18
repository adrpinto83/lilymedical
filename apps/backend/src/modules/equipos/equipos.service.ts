import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { EquipoInput, MantenimientoInput } from "./equipos.schema";

const DIA_MS = 24 * 60 * 60 * 1000;

export type EstadoAlertaMantenimiento = "VENCIDO" | "PROXIMO" | "AL_DIA" | "SIN_PLAN";

export function diasAviso(): number {
  const valor = Number(process.env.EQUIPOS_DIAS_AVISO);
  return Number.isFinite(valor) && valor > 0 ? valor : 15;
}

export function calcularProximoMantenimiento(
  frecuenciaDias: number | null | undefined,
  base: Date | null | undefined,
  hoy: Date = new Date()
): Date | null {
  if (!frecuenciaDias) return null;
  return new Date((base ?? hoy).getTime() + frecuenciaDias * DIA_MS);
}

export function estadoAlertaMantenimiento(
  proximo: Date | null | undefined,
  hoy: Date = new Date(),
  aviso: number = diasAviso()
): EstadoAlertaMantenimiento {
  if (!proximo) return "SIN_PLAN";
  // Las fechas llegan de un <input type="date"> y se guardan como medianoche
  // UTC; se comparan contra la fecha de calendario local para que un equipo
  // no figure vencido la noche anterior en zonas con offset negativo (VET).
  const hoyCalendario = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (proximo.getTime() < hoyCalendario) return "VENCIDO";
  if (proximo.getTime() - hoyCalendario <= aviso * DIA_MS) return "PROXIMO";
  return "AL_DIA";
}

export async function listarEquipos(incluirBajas: boolean) {
  return prisma.equipo.findMany({
    where: incluirBajas ? {} : { activo: true },
    orderBy: [{ proximoMantenimiento: { sort: "asc", nulls: "last" } }, { nombre: "asc" }],
  });
}

export async function obtenerEquipo(id: string) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      mantenimientos: {
        orderBy: { fecha: "desc" },
        include: { registradoPor: { select: { nombre: true, apellido: true } } },
      },
    },
  });
  if (!equipo) throw new HttpError(404, "Equipo no encontrado");
  return equipo;
}

// Si el formulario no fija proximoMantenimiento explícitamente, se deriva de
// la frecuencia a partir del último mantenimiento (o de la fecha de compra).
function conProximoCalculado(data: EquipoInput): EquipoInput {
  if (data.proximoMantenimiento !== undefined) return data;
  return {
    ...data,
    proximoMantenimiento: calcularProximoMantenimiento(
      data.frecuenciaMantenimientoDias,
      data.ultimoMantenimiento ?? data.fechaAdquisicion
    ),
  };
}

export async function crearEquipo(data: EquipoInput) {
  return prisma.equipo.create({ data: conProximoCalculado(data) });
}

export async function actualizarEquipo(id: string, data: EquipoInput) {
  await obtenerEquipo(id);
  return prisma.equipo.update({ where: { id }, data: conProximoCalculado(data) });
}

export async function darDeBaja(id: string) {
  await obtenerEquipo(id);
  return prisma.equipo.update({
    where: { id },
    data: { activo: false, estado: "DADO_DE_BAJA", proximoMantenimiento: null },
  });
}

// Un correctivo (reparación) no reinicia el calendario preventivo; solo
// el preventivo y la calibración mueven ultimo/proximoMantenimiento.
export async function registrarMantenimiento(
  equipoId: string,
  input: MantenimientoInput,
  usuarioId: string
) {
  const equipo = await obtenerEquipo(equipoId);
  const { estadoResultante, ...datos } = input;

  const reiniciaCalendario =
    datos.tipo !== "CORRECTIVO" &&
    (!equipo.ultimoMantenimiento || datos.fecha >= equipo.ultimoMantenimiento);

  const [mantenimiento] = await prisma.$transaction([
    prisma.mantenimientoEquipo.create({
      data: { ...datos, equipoId, registradoPorId: usuarioId },
    }),
    prisma.equipo.update({
      where: { id: equipoId },
      data: {
        estado: estadoResultante,
        ...(reiniciaCalendario && {
          ultimoMantenimiento: datos.fecha,
          proximoMantenimiento: calcularProximoMantenimiento(
            equipo.frecuenciaMantenimientoDias,
            datos.fecha
          ),
        }),
      },
    }),
  ]);
  return mantenimiento;
}

export async function obtenerAlertas() {
  const hoy = new Date();
  const aviso = diasAviso();
  const equipos = await prisma.equipo.findMany({
    where: { activo: true, estado: { not: "DADO_DE_BAJA" } },
    orderBy: { nombre: "asc" },
  });

  return {
    diasAviso: aviso,
    mantenimientoVencido: equipos.filter(
      (e) => estadoAlertaMantenimiento(e.proximoMantenimiento, hoy, aviso) === "VENCIDO"
    ),
    mantenimientoProximo: equipos.filter(
      (e) => estadoAlertaMantenimiento(e.proximoMantenimiento, hoy, aviso) === "PROXIMO"
    ),
    fueraDeServicio: equipos.filter(
      (e) => e.estado === "FUERA_DE_SERVICIO" || e.estado === "EN_MANTENIMIENTO"
    ),
  };
}
