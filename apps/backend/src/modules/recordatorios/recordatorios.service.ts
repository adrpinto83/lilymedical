import { prisma } from "../../lib/prisma";
import { correoConfigurado } from "../../lib/mailer";
import { datosConsultorio, enviarRecordatorioCita, includeCita } from "../correos/correos.service";

export interface ResultadoRecordatorios {
  configurado: boolean;
  revisadas: number;
  enviados: number;
  fallidos: number;
  sinEmail: number;
}

function horasAntes(): number {
  const valor = Number(process.env.RECORDATORIO_HORAS_ANTES);
  return Number.isFinite(valor) && valor > 0 ? valor : 24;
}

// Busca citas próximas (dentro de la ventana configurada) sin recordatorio
// enviado y les envía un email al paciente. Se usa tanto desde el cron
// programado como desde el endpoint de envío manual.
export async function enviarRecordatoriosPendientes(): Promise<ResultadoRecordatorios> {
  const resultado: ResultadoRecordatorios = {
    configurado: correoConfigurado(),
    revisadas: 0,
    enviados: 0,
    fallidos: 0,
    sinEmail: 0,
  };
  if (!resultado.configurado) return resultado;

  const ahora = new Date();
  const limite = new Date(ahora.getTime() + horasAntes() * 60 * 60 * 1000);

  const citas = await prisma.cita.findMany({
    where: {
      estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
      recordatorioEnviado: false,
      fechaHoraInicio: { gte: ahora, lte: limite },
    },
    include: includeCita,
  });
  resultado.revisadas = citas.length;
  if (citas.length === 0) return resultado;

  const consultorio = await datosConsultorio();

  for (const cita of citas) {
    const email = cita.paciente.email;
    if (!email) {
      resultado.sinEmail++;
      continue;
    }

    const enviado = await enviarRecordatorioCita({ ...cita, paciente: { ...cita.paciente, email } }, consultorio);

    if (enviado) {
      await prisma.cita.update({ where: { id: cita.id }, data: { recordatorioEnviado: true } });
      resultado.enviados++;
    } else {
      resultado.fallidos++;
    }
  }

  return resultado;
}
