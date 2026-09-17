import { prisma } from "../../lib/prisma";
import { enviarEmail, correoConfigurado } from "../../lib/mailer";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { Membrete } from "../../lib/pdf";

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

function plantillaRecordatorio(
  paciente: { nombres: string; apellidos: string },
  fechaHoraInicio: Date,
  membrete: Membrete
): { subject: string; html: string } {
  const fecha = fechaHoraInicio.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hora = fechaHoraInicio.toLocaleTimeString("es-VE", { hour: "numeric", minute: "2-digit" });
  const medico = `Dra. ${membrete.medicoNombre} ${membrete.medicoApellido}`;

  return {
    subject: `Recordatorio de tu cita — ${fecha}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #15304a; max-width: 480px;">
        <p>Hola ${paciente.nombres},</p>
        <p>Te recordamos tu cita con <strong>${medico}</strong>:</p>
        <p style="font-size: 16px; margin: 16px 0;">
          📅 <strong>${fecha}</strong><br />
          🕐 <strong>${hora}</strong>
        </p>
        ${membrete.direccionConsultorio ? `<p>📍 ${membrete.direccionConsultorio}</p>` : ""}
        ${membrete.telefonoConsultorio ? `<p>📞 ${membrete.telefonoConsultorio}</p>` : ""}
        <p style="color: #4c6478; font-size: 13px; margin-top: 24px;">
          Si necesitas reprogramar o cancelar, por favor contáctanos con anticipación.
        </p>
      </div>
    `,
  };
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
    include: { paciente: { select: { nombres: true, apellidos: true, email: true } } },
  });
  resultado.revisadas = citas.length;

  const membretesPorProfesional = new Map<string, Membrete>();

  for (const cita of citas) {
    if (!cita.paciente.email) {
      resultado.sinEmail++;
      continue;
    }

    let membrete = membretesPorProfesional.get(cita.profesionalId);
    if (!membrete) {
      membrete = await construirMembrete(cita.profesionalId);
      membretesPorProfesional.set(cita.profesionalId, membrete);
    }

    const { subject, html } = plantillaRecordatorio(cita.paciente, cita.fechaHoraInicio, membrete);
    const enviado = await enviarEmail({ to: cita.paciente.email, subject, html });

    if (enviado) {
      await prisma.cita.update({ where: { id: cita.id }, data: { recordatorioEnviado: true } });
      resultado.enviados++;
    } else {
      resultado.fallidos++;
    }
  }

  return resultado;
}
