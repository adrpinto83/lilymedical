import { Prisma, RolUsuario } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { AdjuntoEmail, correoConfigurado, enviarEmail } from "../../lib/mailer";
import { generarPdfEnMemoria, Membrete } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { generarRecetaPdf } from "../recetas/recetas.pdf";
import { generarConstanciaPdf } from "../constancias/constancias.pdf";
import { generarPlanEjerciciosPdf } from "../planes-ejercicios/planes-ejercicios.pdf";
import { generarFacturaPdf } from "../facturacion/facturacion.pdf";
import { obtenerFactura } from "../facturacion/facturacion.service";
import { CorreoGenerado, DatosConsultorio, ZONA_HORARIA } from "./correos.layout";
import * as plantillas from "./correos.plantillas";

// ---------- Utilidades ----------

/** El médico titular: su membrete identifica a la consulta en correos y facturas. */
export async function obtenerMedicoTitular() {
  const titular = await prisma.usuario.findFirst({
    where: { rol: "MEDICO", activo: true },
    orderBy: { createdAt: "asc" },
  });
  if (!titular) throw new HttpError(500, "No hay un médico titular configurado para el membrete");
  return titular;
}

export function nombreProfesional(usuario: { nombre: string; apellido: string; rol?: RolUsuario }): string {
  const prefijo = !usuario.rol || usuario.rol === "MEDICO" ? "Dra. " : "";
  return `${prefijo}${usuario.nombre} ${usuario.apellido}`;
}

function consultorioDesdeMembrete(membrete: Membrete): DatosConsultorio {
  return {
    nombreMedico: nombreProfesional({ nombre: membrete.medicoNombre, apellido: membrete.medicoApellido }),
    titulo: membrete.tituloProfesional,
    direccion: membrete.direccionConsultorio,
    telefono: membrete.telefonoConsultorio,
    instagram: membrete.instagram,
  };
}

export async function datosConsultorio(): Promise<DatosConsultorio> {
  const titular = await obtenerMedicoTitular();
  return consultorioDesdeMembrete(await construirMembrete(titular.id));
}

async function enviar(para: string, correo: CorreoGenerado, attachments?: AdjuntoEmail[]) {
  return enviarEmail({ to: para, subject: correo.subject, html: correo.html, text: correo.text, attachments });
}

/**
 * Los avisos automáticos nunca frenan ni rompen la operación que los
 * dispara (agendar, cobrar...): se envían después de responder y cualquier
 * error solo queda en el log.
 */
export function enSegundoPlano(etiqueta: string, tarea: () => Promise<unknown>) {
  if (!correoConfigurado()) return;
  setImmediate(() => {
    tarea().catch((err) => console.error(`Correo "${etiqueta}" no enviado:`, err));
  });
}

// ---------- Citas ----------

export const includeCita = {
  paciente: { select: { nombres: true, email: true } },
  profesional: { select: { nombre: true, apellido: true, rol: true } },
  tarifa: { select: { nombreServicio: true } },
} satisfies Prisma.CitaInclude;

type CitaConDatos = Prisma.CitaGetPayload<{ include: typeof includeCita }>;

function datosCita(cita: CitaConDatos) {
  return {
    inicio: cita.fechaHoraInicio,
    fin: cita.fechaHoraFin,
    profesional: nombreProfesional(cita.profesional),
    servicio: cita.tarifa?.nombreServicio,
    numeroSesion: cita.numeroSesionEnGrupo,
    totalSesiones: cita.totalSesionesGrupo,
  };
}

function icsCita(cita: CitaConDatos, consultorio: DatosConsultorio, opciones: { cancelada?: boolean } = {}): AdjuntoEmail {
  return {
    filename: "cita.ics",
    contentType: "text/calendar; charset=utf-8",
    content: plantillas.archivoIcs({
      uid: cita.id,
      titulo: `Cita con ${nombreProfesional(cita.profesional)}`,
      inicio: cita.fechaHoraInicio,
      fin: cita.fechaHoraFin,
      lugar: consultorio.direccion,
      cancelada: opciones.cancelada,
      // Cada cambio debe superar la secuencia anterior para que el calendario lo aplique.
      secuencia: Math.floor(cita.updatedAt.getTime() / 1000),
    }),
  };
}

async function cargarCitaFutura(citaId: string) {
  const cita = await prisma.cita.findUnique({ where: { id: citaId }, include: includeCita });
  // Citas pasadas (registradas a posteriori) no generan avisos.
  if (!cita?.paciente.email || cita.fechaHoraInicio <= new Date()) return null;
  return cita as CitaConDatos & { paciente: { email: string } };
}

export async function notificarCitaAgendada(citaId: string) {
  const cita = await cargarCitaFutura(citaId);
  if (!cita) return;
  const consultorio = await datosConsultorio();
  await enviar(cita.paciente.email, plantillas.citaAgendada(cita.paciente, datosCita(cita), consultorio), [
    icsCita(cita, consultorio),
  ]);
}

export async function notificarPaqueteAgendado(citaIds: string[]) {
  const citas = await prisma.cita.findMany({
    where: { id: { in: citaIds } },
    include: includeCita,
    orderBy: { fechaHoraInicio: "asc" },
  });
  const primera = citas[0];
  if (!primera?.paciente.email) return;
  const consultorio = await datosConsultorio();
  await enviar(
    primera.paciente.email,
    plantillas.paqueteAgendado(
      primera.paciente,
      citas.map((c) => ({ inicio: c.fechaHoraInicio, fin: c.fechaHoraFin })),
      nombreProfesional(primera.profesional),
      primera.tarifa?.nombreServicio,
      consultorio
    )
  );
}

export async function notificarCitaReprogramada(citaId: string, anterior: Date) {
  const cita = await cargarCitaFutura(citaId);
  if (!cita) return;
  const consultorio = await datosConsultorio();
  await enviar(
    cita.paciente.email,
    plantillas.citaReprogramada(cita.paciente, anterior, datosCita(cita), consultorio),
    [icsCita(cita, consultorio)]
  );
}

export async function notificarCitaCancelada(citaId: string) {
  const cita = await cargarCitaFutura(citaId);
  if (!cita) return;
  const consultorio = await datosConsultorio();
  await enviar(cita.paciente.email, plantillas.citaCancelada(cita.paciente, datosCita(cita), consultorio), [
    icsCita(cita, consultorio, { cancelada: true }),
  ]);
}

export async function notificarPaqueteCancelado(citaIds: string[]) {
  const citas = await prisma.cita.findMany({
    where: { id: { in: citaIds }, fechaHoraInicio: { gt: new Date() } },
    include: includeCita,
    orderBy: { fechaHoraInicio: "asc" },
  });
  const primera = citas[0];
  if (!primera?.paciente.email) return;
  const consultorio = await datosConsultorio();
  await enviar(
    primera.paciente.email,
    plantillas.paqueteCancelado(
      primera.paciente,
      citas.map((c) => ({ inicio: c.fechaHoraInicio })),
      consultorio
    )
  );
}

export async function notificarInasistencia(citaId: string) {
  const cita = await prisma.cita.findUnique({ where: { id: citaId }, include: includeCita });
  // Solo inasistencias recientes: marcar una cita vieja no debe escribirle al paciente.
  const hace3Dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  if (!cita?.paciente.email || cita.fechaHoraInicio < hace3Dias) return;
  const consultorio = await datosConsultorio();
  await enviar(cita.paciente.email, plantillas.inasistencia(cita.paciente, cita.fechaHoraInicio, consultorio));
}

// Usado por el job de recordatorios (ver recordatorios.service).
export async function enviarRecordatorioCita(cita: CitaConDatos & { paciente: { email: string } }, consultorio: DatosConsultorio) {
  return enviar(cita.paciente.email, plantillas.recordatorioCita(cita.paciente, datosCita(cita), consultorio), [
    icsCita(cita, consultorio),
  ]);
}

// ---------- Cumpleaños ----------

export interface ResultadoCumpleanos {
  configurado: boolean;
  cumpleaneros: Array<{ id: string; nombre: string; email: string | null; felicitado: boolean }>;
  enviados: number;
  fallidos: number;
  sinEmail: number;
}

/** Día y mes de hoy en la zona del consultorio (el servidor puede estar en UTC). */
export function hoyEnConsultorio(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(ahora);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value);
  return { anio: valor("year"), mes: valor("month"), dia: valor("day") };
}

/**
 * ¿Cumple años hoy? La fecha de nacimiento es fecha sin hora (medianoche UTC),
 * así que se lee en UTC. Quien nació un 29 de febrero celebra el 28 en los
 * años no bisiestos.
 */
export function cumpleHoy(fechaNacimiento: Date, hoy: { anio: number; mes: number; dia: number }): boolean {
  const mes = fechaNacimiento.getUTCMonth() + 1;
  const dia = fechaNacimiento.getUTCDate();
  if (mes === hoy.mes && dia === hoy.dia) return true;
  const bisiesto = (hoy.anio % 4 === 0 && hoy.anio % 100 !== 0) || hoy.anio % 400 === 0;
  return mes === 2 && dia === 29 && !bisiesto && hoy.mes === 2 && hoy.dia === 28;
}

async function cumpleanerosDeHoy(ahora: Date) {
  const hoy = hoyEnConsultorio(ahora);
  // Un consultorio tiene a lo sumo unos miles de pacientes: filtrar en memoria
  // es más simple que extraer día/mes en SQL.
  const pacientes = await prisma.paciente.findMany({
    where: { activo: true },
    select: { id: true, nombres: true, apellidos: true, email: true, fechaNacimiento: true, cumpleanosFelicitadoAnio: true },
  });
  return { hoy, pacientes: pacientes.filter((p) => cumpleHoy(p.fechaNacimiento, hoy)) };
}

export async function listarCumpleanerosDeHoy(ahora = new Date()) {
  const { hoy, pacientes } = await cumpleanerosDeHoy(ahora);
  return pacientes.map((p) => ({
    id: p.id,
    nombre: `${p.nombres} ${p.apellidos}`,
    email: p.email,
    felicitado: p.cumpleanosFelicitadoAnio === hoy.anio,
  }));
}

/** Felicita por correo a quienes cumplen años hoy y aún no la recibieron este año. */
export async function enviarFelicitacionesCumpleanos(ahora = new Date()): Promise<ResultadoCumpleanos> {
  const resultado: ResultadoCumpleanos = {
    configurado: correoConfigurado(),
    cumpleaneros: [],
    enviados: 0,
    fallidos: 0,
    sinEmail: 0,
  };
  const { hoy, pacientes } = await cumpleanerosDeHoy(ahora);
  if (!resultado.configurado || pacientes.length === 0) {
    resultado.cumpleaneros = await listarCumpleanerosDeHoy(ahora);
    return resultado;
  }

  let consultorio: DatosConsultorio | null = null;
  for (const p of pacientes) {
    if (p.cumpleanosFelicitadoAnio === hoy.anio) continue;
    if (!p.email) {
      resultado.sinEmail++;
      continue;
    }
    consultorio ??= await datosConsultorio();
    const ok = await enviar(p.email, plantillas.felicitacionCumpleanos(p, consultorio));
    if (ok) {
      await prisma.paciente.update({ where: { id: p.id }, data: { cumpleanosFelicitadoAnio: hoy.anio } });
      resultado.enviados++;
    } else {
      resultado.fallidos++;
    }
  }
  resultado.cumpleaneros = await listarCumpleanerosDeHoy(ahora);
  return resultado;
}

// ---------- Cuentas y portal ----------

export async function notificarBienvenidaPaciente(pacienteId: string) {
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente?.email) return;
  await enviar(paciente.email, plantillas.bienvenidaPaciente(paciente, await datosConsultorio()));
}

export async function notificarPortalActivado(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return;
  await enviar(
    usuario.email,
    plantillas.portalActivado({ nombres: usuario.nombre }, usuario.email, await datosConsultorio())
  );
}

const NOMBRE_ROL: Record<RolUsuario, string> = {
  ADMIN: "Administrador del sistema",
  MEDICO: "Médico",
  ADMINISTRATIVO: "Administrativo",
  FISIATRA_AYUDANTE: "Fisiatra ayudante",
  PACIENTE: "Paciente",
};

export async function notificarCuentaPersonalCreada(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || usuario.rol === "PACIENTE") return;
  await enviar(
    usuario.email,
    plantillas.cuentaPersonalCreada(
      { nombre: usuario.nombre, email: usuario.email, rol: NOMBRE_ROL[usuario.rol] },
      await datosConsultorio()
    )
  );
}

export async function notificarPasswordCambiada(usuarioId: string, porAdministrador: boolean) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || usuario.eliminadoEn) return;
  await enviar(
    usuario.email,
    plantillas.passwordCambiada({ nombre: usuario.nombre, porAdministrador }, await datosConsultorio())
  );
}

export async function notificarCuentaBloqueada(usuarioId: string, minutos: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return;
  await enviar(usuario.email, plantillas.cuentaBloqueada({ nombre: usuario.nombre, minutos }, await datosConsultorio()));
}

export async function enviarEnlaceRestablecimiento(
  usuario: { nombre: string; email: string },
  url: string,
  minutos: number
) {
  return enviar(
    usuario.email,
    plantillas.restablecerPassword({ nombre: usuario.nombre, url, minutos }, await datosConsultorio())
  );
}

// ---------- Envío manual de documentos (con PDF adjunto) ----------

export interface ResultadoEnvio {
  email: string;
}

function exigirCorreo(email: string | null | undefined): string {
  if (!correoConfigurado()) throw new HttpError(503, "El envío de correos no está configurado en el servidor");
  if (!email) throw new HttpError(400, "El paciente no tiene un correo registrado. Agrégalo en su ficha.");
  return email;
}

async function enviarOFallar(para: string, correo: CorreoGenerado, adjuntos: AdjuntoEmail[]): Promise<ResultadoEnvio> {
  const ok = await enviar(para, correo, adjuntos);
  if (!ok) throw new HttpError(502, "No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
  return { email: para };
}

const pdf = (filename: string, content: Buffer): AdjuntoEmail => ({
  filename,
  content,
  contentType: "application/pdf",
});

export async function enviarRecetaPorCorreo(recetaId: string): Promise<ResultadoEnvio> {
  const receta = await prisma.receta.findUnique({
    where: { id: recetaId },
    include: {
      items: { orderBy: { orden: "asc" } },
      paciente: true,
      historiaClinica: { select: { alergias: true } },
      medico: true,
    },
  });
  if (!receta) throw new HttpError(404, "Receta no encontrada");
  const para = exigirCorreo(receta.paciente.email);

  const membrete = await construirMembrete(receta.medicoId);
  const archivo = await generarPdfEnMemoria("MEDIA_CARTA", (doc) => generarRecetaPdf(doc, receta, membrete));
  const correo = plantillas.recetaEnviada(
    receta.paciente,
    {
      numero: receta.numeroReceta,
      tipo: receta.tipo,
      fecha: receta.fecha,
      medico: nombreProfesional(receta.medico),
      vencimiento: receta.fechaVencimiento,
      codigoVerificacion: receta.codigoVerificacion,
    },
    consultorioDesdeMembrete(membrete)
  );
  return enviarOFallar(para, correo, [pdf(`${receta.numeroReceta}.pdf`, archivo)]);
}

export async function enviarConstanciaPorCorreo(constanciaId: string): Promise<ResultadoEnvio> {
  const constancia = await prisma.constanciaMedica.findUnique({
    where: { id: constanciaId },
    include: { paciente: true, medico: true },
  });
  if (!constancia) throw new HttpError(404, "Constancia no encontrada");
  const para = exigirCorreo(constancia.paciente.email);

  const membrete = await construirMembrete(constancia.medicoId);
  const archivo = await generarPdfEnMemoria("MEDIA_CARTA", (doc) => generarConstanciaPdf(doc, constancia, membrete));
  const correo = plantillas.constanciaEnviada(
    constancia.paciente,
    {
      numero: constancia.numeroConstancia,
      fecha: constancia.fecha,
      medico: nombreProfesional(constancia.medico),
      diasReposo: constancia.diasReposo,
      inicioReposo: constancia.fechaInicioReposo,
      finReposo: constancia.fechaFinReposo,
      codigoVerificacion: constancia.codigoVerificacion,
    },
    consultorioDesdeMembrete(membrete)
  );
  return enviarOFallar(para, correo, [pdf(`${constancia.numeroConstancia}.pdf`, archivo)]);
}

export async function enviarPlanEjerciciosPorCorreo(planId: string): Promise<ResultadoEnvio> {
  const plan = await prisma.planEjercicios.findUnique({
    where: { id: planId },
    include: { items: { orderBy: { orden: "asc" } }, paciente: true, medico: true },
  });
  if (!plan) throw new HttpError(404, "Plan de ejercicios no encontrado");
  const para = exigirCorreo(plan.paciente.email);

  const membrete = await construirMembrete(plan.medicoId);
  const archivo = await generarPdfEnMemoria("MEDIA_CARTA", (doc) => generarPlanEjerciciosPdf(doc, plan, membrete));
  const correo = plantillas.planEjerciciosEnviado(
    plan.paciente,
    { fecha: plan.fecha, medico: nombreProfesional(plan.medico), notas: plan.notas, items: plan.items },
    consultorioDesdeMembrete(membrete)
  );
  return enviarOFallar(para, correo, [pdf(`guia-ejercicios-${plan.paciente.documento}.pdf`, archivo)]);
}

export async function enviarFacturaPorCorreo(facturaId: string): Promise<ResultadoEnvio> {
  const factura = await obtenerFactura(facturaId);
  if (factura.estado === "ANULADA") throw new HttpError(400, "No se envían facturas anuladas");
  const para = exigirCorreo(factura.paciente.email);

  const titular = await obtenerMedicoTitular();
  const membrete = await construirMembrete(titular.id);
  const archivo = await generarPdfEnMemoria("CARTA", (doc) => generarFacturaPdf(doc, factura, membrete));
  const correo = plantillas.facturaEnviada(
    factura.paciente,
    {
      numero: factura.numeroFactura,
      fecha: factura.fecha,
      total: factura.total,
      montoAseguradora: factura.montoAseguradora,
      montoPaciente: factura.montoPaciente,
      pagado: factura.pagado,
      saldo: factura.saldo,
      aseguradora: factura.aseguradora?.nombre,
      detalles: factura.detalles.map((d) => ({
        descripcion: d.descripcion ?? d.tarifa.nombreServicio,
        cantidad: d.cantidad,
        subtotal: d.subtotal,
      })),
    },
    consultorioDesdeMembrete(membrete)
  );
  return enviarOFallar(para, correo, [pdf(`${factura.numeroFactura}.pdf`, archivo)]);
}

// ---------- Pagos (automático) ----------

export async function notificarPagoRecibido(facturaId: string, pagoId: string) {
  const factura = await obtenerFactura(facturaId);
  const pago = factura.pagos.find((p) => p.id === pagoId);
  // Los pagos que hace la aseguradora no son del paciente: no se le notifican.
  if (!pago || !factura.paciente.email || pago.metodoPago === "SEGURO") return;
  await enviar(
    factura.paciente.email,
    plantillas.pagoRecibido(
      factura.paciente,
      {
        numeroFactura: factura.numeroFactura,
        monto: pago.monto,
        metodo: pago.metodoPago,
        fecha: pago.fecha,
        referencia: pago.referencia,
        montoBs: pago.montoBs,
        tasaCambio: pago.tasaCambio,
        saldo: factura.saldo,
      },
      await datosConsultorio()
    )
  );
}
