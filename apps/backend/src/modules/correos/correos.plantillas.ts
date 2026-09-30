// Plantillas de todos los correos que envía el sistema. Son funciones puras
// (datos → asunto/HTML/texto) para poder probarlas y previsualizarlas sin
// base de datos ni SMTP; quién las dispara y cuándo está en correos.service.

import {
  CorreoGenerado,
  DatosConsultorio,
  boton,
  correo,
  esc,
  fechaCorta,
  fechaLarga,
  fechaSinHora,
  hora,
  lista,
  nota,
  parrafo,
  recuadro,
  urlApp,
  usd,
} from "./correos.layout";

interface Persona {
  nombres: string;
}

interface DatosCita {
  inicio: Date;
  fin: Date;
  profesional: string; // "Dra. Lilia Figuera"
  servicio?: string | null;
  numeroSesion?: number | null;
  totalSesiones?: number | null;
}

function filasCita(cita: DatosCita, consultorio: DatosConsultorio): Array<[string, string]> {
  const filas: Array<[string, string]> = [
    ["Fecha", esc(fechaLarga(cita.inicio))],
    ["Hora", esc(`${hora(cita.inicio)} – ${hora(cita.fin)}`)],
    ["Con", esc(cita.profesional)],
  ];
  if (cita.servicio) filas.push(["Servicio", esc(cita.servicio)]);
  if (cita.numeroSesion && cita.totalSesiones) {
    filas.push(["Sesión", esc(`${cita.numeroSesion} de ${cita.totalSesiones}`)]);
  }
  if (consultorio.direccion) filas.push(["Lugar", esc(consultorio.direccion)]);
  return filas;
}

function contactoParaCambios(consultorio: DatosConsultorio): string {
  return consultorio.telefono
    ? `Si necesitas reprogramar o cancelar, respóndenos este correo o escríbenos al ${esc(consultorio.telefono)}, idealmente con 24 horas de anticipación.`
    : "Si necesitas reprogramar o cancelar, respóndenos este correo, idealmente con 24 horas de anticipación.";
}

// Enlace "Agregar a Google Calendar" (los demás calendarios usan el .ics adjunto).
export function enlaceGoogleCalendar(titulo: string, inicio: Date, fin: Date, lugar?: string | null): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: `${f(inicio)}/${f(fin)}`,
    details: "Cita agendada en LilyMedical",
  });
  if (lugar) params.set("location", lugar);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Archivo .ics para que el paciente agregue la cita a su calendario (Apple,
// Outlook, Google). CANCEL la quita si ya la había agregado.
export function archivoIcs(opciones: {
  uid: string;
  titulo: string;
  inicio: Date;
  fin: Date;
  lugar?: string | null;
  cancelada?: boolean;
  secuencia?: number;
}): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const texto = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LilyMedical//Citas//ES",
    `METHOD:${opciones.cancelada ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${opciones.uid}@lilymedical`,
    `SEQUENCE:${opciones.secuencia ?? 0}`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(opciones.inicio)}`,
    `DTEND:${f(opciones.fin)}`,
    `SUMMARY:${texto(opciones.titulo)}`,
    opciones.lugar ? `LOCATION:${texto(opciones.lugar)}` : "",
    `STATUS:${opciones.cancelada ? "CANCELLED" : "CONFIRMED"}`,
    ...(opciones.cancelada
      ? []
      : ["BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Cita en LilyMedical", "END:VALARM"]),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

// ---------- Citas ----------

export function citaAgendada(p: Persona, cita: DatosCita, consultorio: DatosConsultorio): CorreoGenerado {
  const calendario = enlaceGoogleCalendar(`Cita con ${cita.profesional}`, cita.inicio, cita.fin, consultorio.direccion);
  return correo({
    subject: `Tu cita quedó agendada — ${fechaLarga(cita.inicio)}`,
    titulo: "Tu cita quedó agendada",
    preencabezado: `${fechaLarga(cita.inicio)} a las ${hora(cita.inicio)} con ${cita.profesional}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo("Confirmamos que tu cita quedó registrada con estos datos:")}
      ${recuadro(filasCita(cita, consultorio))}
      ${parrafo("Te recomendamos llegar 10 minutos antes y usar ropa cómoda que permita moverte con facilidad.")}
      ${boton("Agregar a mi calendario", calendario)}
      ${nota(`${contactoParaCambios(consultorio)} Te enviaremos un recordatorio un día antes.`)}`,
  });
}

export function paqueteAgendado(
  p: Persona,
  sesiones: Array<{ inicio: Date; fin: Date }>,
  profesional: string,
  servicio: string | null | undefined,
  consultorio: DatosConsultorio
): CorreoGenerado {
  const primera = sesiones[0];
  return correo({
    subject: `Tus ${sesiones.length} sesiones quedaron agendadas`,
    titulo: `Tus ${sesiones.length} sesiones quedaron agendadas`,
    preencabezado: `Primera sesión: ${fechaLarga(primera.inicio)} a las ${hora(primera.inicio)}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo(
        `Agendamos tu plan de <strong>${sesiones.length} sesiones</strong> con ${esc(profesional)}${
          servicio ? ` (${esc(servicio)})` : ""
        }. Estas son las fechas:`
      )}
      ${lista(
        sesiones.map(
          (s, i) =>
            `<strong>Sesión ${i + 1}:</strong> ${esc(fechaLarga(s.inicio))}, ${esc(hora(s.inicio))}`
        )
      )}
      ${consultorio.direccion ? parrafo(`📍 ${esc(consultorio.direccion)}`) : ""}
      ${parrafo("La constancia en las sesiones es clave para tu recuperación. Antes de cada una te enviaremos un recordatorio.")}
      ${boton("Ver mis citas en el portal", urlApp("/portal/citas"))}
      ${nota(contactoParaCambios(consultorio))}`,
  });
}

export function citaReprogramada(
  p: Persona,
  anterior: Date,
  cita: DatosCita,
  consultorio: DatosConsultorio
): CorreoGenerado {
  const calendario = enlaceGoogleCalendar(`Cita con ${cita.profesional}`, cita.inicio, cita.fin, consultorio.direccion);
  return correo({
    subject: `Tu cita fue reprogramada — ${fechaLarga(cita.inicio)}`,
    titulo: "Tu cita fue reprogramada",
    preencabezado: `Nueva fecha: ${fechaLarga(cita.inicio)} a las ${hora(cita.inicio)}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo(
        `Tu cita del <span style="text-decoration:line-through;">${esc(fechaLarga(anterior))}, ${esc(hora(anterior))}</span> cambió a:`
      )}
      ${recuadro(filasCita(cita, consultorio), "Nueva fecha")}
      ${boton("Actualizar mi calendario", calendario)}
      ${nota(`Si la nueva fecha no te funciona, respóndenos este correo${consultorio.telefono ? ` o escríbenos al ${esc(consultorio.telefono)}` : ""} y buscamos otra opción.`)}`,
  });
}

export function citaCancelada(p: Persona, cita: DatosCita, consultorio: DatosConsultorio): CorreoGenerado {
  return correo({
    subject: `Tu cita del ${fechaCorta(cita.inicio)} fue cancelada`,
    titulo: "Tu cita fue cancelada",
    preencabezado: `${fechaLarga(cita.inicio)} a las ${hora(cita.inicio)}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo("Te confirmamos que la siguiente cita quedó <strong>cancelada</strong>:")}
      ${recuadro([
        ["Fecha", esc(fechaLarga(cita.inicio))],
        ["Hora", esc(hora(cita.inicio))],
        ["Con", esc(cita.profesional)],
      ])}
      ${parrafo(`¿Quieres agendar una nueva fecha? Respóndenos este correo${consultorio.telefono ? ` o escríbenos al ${esc(consultorio.telefono)}` : ""} y con gusto te ayudamos.`)}`,
  });
}

export function paqueteCancelado(
  p: Persona,
  sesiones: Array<{ inicio: Date }>,
  consultorio: DatosConsultorio
): CorreoGenerado {
  return correo({
    subject: `Se cancelaron ${sesiones.length} sesiones pendientes`,
    titulo: "Tus sesiones pendientes fueron canceladas",
    preencabezado: `${sesiones.length} sesiones canceladas`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo("Te confirmamos que se cancelaron las siguientes sesiones de tu plan:")}
      ${lista(sesiones.map((s) => `${esc(fechaLarga(s.inicio))}, ${esc(hora(s.inicio))}`))}
      ${parrafo(`Si deseas retomar tu tratamiento, respóndenos este correo${consultorio.telefono ? ` o escríbenos al ${esc(consultorio.telefono)}` : ""}.`)}`,
  });
}

export function recordatorioCita(p: Persona, cita: DatosCita, consultorio: DatosConsultorio): CorreoGenerado {
  return correo({
    subject: `Recordatorio: tu cita es el ${fechaLarga(cita.inicio)} a las ${hora(cita.inicio)}`,
    titulo: "Te esperamos pronto",
    preencabezado: `${fechaLarga(cita.inicio)} a las ${hora(cita.inicio)} con ${cita.profesional}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo("Te recordamos tu próxima cita:")}
      ${recuadro(filasCita(cita, consultorio))}
      ${lista([
        "Llega 10 minutos antes.",
        "Usa ropa cómoda que permita mover la zona a tratar.",
        "Trae tus estudios o informes recientes si los tienes.",
      ])}
      ${nota(contactoParaCambios(consultorio))}`,
  });
}

export function inasistencia(p: Persona, inicio: Date, consultorio: DatosConsultorio): CorreoGenerado {
  return correo({
    subject: "Te extrañamos en tu cita",
    titulo: "Te extrañamos en tu cita",
    preencabezado: `No pudimos verte el ${fechaLarga(inicio)}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo(`Notamos que no pudiste asistir a tu cita del <strong>${esc(fechaLarga(inicio))}</strong> a las ${esc(hora(inicio))}.`)}
      ${parrafo("Esperamos que todo esté bien. Mantener la continuidad del tratamiento es importante para tu recuperación, así que nos encantaría ayudarte a reagendar.")}
      ${parrafo(`Respóndenos este correo${consultorio.telefono ? ` o escríbenos al ${esc(consultorio.telefono)}` : ""} y buscamos la fecha que mejor te convenga.`)}`,
  });
}

export function felicitacionCumpleanos(p: Persona, consultorio: DatosConsultorio): CorreoGenerado {
  return correo({
    subject: `¡Feliz cumpleaños, ${p.nombres}! 🎉`,
    titulo: `¡Feliz cumpleaños, ${p.nombres}! 🎂`,
    preencabezado: `${consultorio.nombreMedico} y todo el equipo te desean un día maravilloso.`,
    consultorio,
    cuerpo: `
      ${parrafo(`Querido(a) ${esc(p.nombres)}:`)}
      ${parrafo(`Hoy es un día especial y no queríamos dejarlo pasar. De parte de ${esc(consultorio.nombreMedico)} y de todo el equipo de LilyMedical, te deseamos un <strong>muy feliz cumpleaños</strong>.`)}
      ${parrafo("Que este nuevo año de vida venga lleno de salud, movimiento y bienestar. Gracias por confiarnos el cuidado de tu cuerpo: acompañarte en tu recuperación es un privilegio.")}
      ${recuadro([["Nuestro regalo", "Un recordatorio para ti: regálate hoy unos minutos de movimiento suave y estiramientos. Tu cuerpo te lo agradecerá."]])}
      ${parrafo("¡Que lo disfrutes mucho!")}
      ${parrafo(`Con cariño,<br><strong>${esc(consultorio.nombreMedico)}</strong> y el equipo de LilyMedical`)}`,
  });
}

// ---------- Cuentas y portal ----------

export function bienvenidaPaciente(p: Persona, consultorio: DatosConsultorio): CorreoGenerado {
  return correo({
    subject: `Bienvenido(a) a LilyMedical, ${p.nombres}`,
    titulo: `¡Bienvenido(a), ${p.nombres}!`,
    preencabezado: "Ya eres parte de nuestra consulta. Crea tu cuenta en el portal del paciente.",
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo(`Gracias por confiar en ${esc(consultorio.nombreMedico)}. Ya registramos tus datos en nuestra consulta.`)}
      ${parrafo("Puedes crear tu cuenta en el <strong>portal del paciente</strong>, donde podrás:")}
      ${lista([
        "Ver tus próximas citas y sesiones.",
        "Descargar tus récipes, constancias y planes de ejercicio.",
        "Mantener actualizados tus datos de contacto.",
      ])}
      ${parrafo("Para crearla solo necesitas tu número de cédula y este mismo correo electrónico.")}
      ${boton("Crear mi cuenta", urlApp("/registro-paciente"))}
      ${nota("Si no solicitaste atención en nuestra consulta, puedes ignorar este mensaje.")}`,
  });
}

export function portalActivado(p: Persona, email: string, consultorio: DatosConsultorio): CorreoGenerado {
  return correo({
    subject: "Tu cuenta del portal del paciente está lista",
    titulo: "Tu cuenta está lista",
    preencabezado: "Ya puedes ver tus citas y documentos en línea.",
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo(`Creaste tu cuenta en el portal del paciente de LilyMedical. Para entrar usa tu correo <strong>${esc(email)}</strong> y la contraseña que elegiste.`)}
      ${boton("Entrar al portal", urlApp("/login"))}
      ${nota("Si no fuiste tú quien creó esta cuenta, respóndenos este correo de inmediato.")}`,
  });
}

export function cuentaPersonalCreada(
  datos: { nombre: string; email: string; rol: string },
  consultorio: DatosConsultorio
): CorreoGenerado {
  return correo({
    subject: "Se creó tu cuenta en LilyMedical",
    titulo: "Tienes una cuenta en LilyMedical",
    preencabezado: `Rol: ${datos.rol}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(datos.nombre)},`)}
      ${parrafo("Se creó tu cuenta de acceso al sistema de gestión de la consulta:")}
      ${recuadro([
        ["Usuario", esc(datos.email)],
        ["Rol", esc(datos.rol)],
      ])}
      ${parrafo("La contraseña inicial te la entregará personalmente quien creó tu cuenta. Te recomendamos cambiarla desde tu perfil al entrar por primera vez.")}
      ${boton("Entrar al sistema", urlApp("/login"))}`,
  });
}

export function passwordCambiada(
  datos: { nombre: string; porAdministrador: boolean },
  consultorio: DatosConsultorio
): CorreoGenerado {
  return correo({
    subject: "Tu contraseña de LilyMedical fue cambiada",
    titulo: "Tu contraseña fue cambiada",
    preencabezado: "Aviso de seguridad de tu cuenta.",
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(datos.nombre)},`)}
      ${parrafo(
        datos.porAdministrador
          ? "La administración de la consulta restableció la contraseña de tu cuenta."
          : "La contraseña de tu cuenta se cambió correctamente."
      )}
      ${parrafo(`Fecha: <strong>${esc(fechaLarga(new Date()))}, ${esc(hora(new Date()))}</strong>`)}
      ${nota("Si no reconoces este cambio, respóndenos este correo de inmediato para proteger tu cuenta.")}`,
  });
}

export function restablecerPassword(
  datos: { nombre: string; url: string; minutos: number },
  consultorio: DatosConsultorio
): CorreoGenerado {
  return correo({
    subject: "Restablece tu contraseña de LilyMedical",
    titulo: "Restablece tu contraseña",
    preencabezado: `El enlace vence en ${datos.minutos} minutos.`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(datos.nombre)},`)}
      ${parrafo("Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para elegir una nueva:")}
      ${boton("Elegir nueva contraseña", datos.url)}
      ${parrafo(`El enlace funciona una sola vez y vence en <strong>${datos.minutos} minutos</strong>.`)}
      ${nota("Si no solicitaste este cambio, ignora este mensaje: tu contraseña actual sigue funcionando.")}`,
  });
}

export function cuentaBloqueada(
  datos: { nombre: string; minutos: number },
  consultorio: DatosConsultorio
): CorreoGenerado {
  return correo({
    subject: "Tu cuenta de LilyMedical fue bloqueada temporalmente",
    titulo: "Bloqueamos tu cuenta por seguridad",
    preencabezado: "Detectamos varios intentos de ingreso con contraseña incorrecta.",
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(datos.nombre)},`)}
      ${parrafo(`Detectamos varios intentos seguidos de ingresar a tu cuenta con una contraseña incorrecta, así que la bloqueamos por <strong>${datos.minutos} minutos</strong>.`)}
      ${parrafo("Si fuiste tú y no recuerdas la contraseña, puedes restablecerla:")}
      ${boton("Restablecer contraseña", urlApp("/olvide-password"))}
      ${nota("Si no fuiste tú, te recomendamos cambiar tu contraseña apenas se desbloquee la cuenta.")}`,
  });
}

// ---------- Documentos clínicos ----------

export function recetaEnviada(
  p: Persona,
  receta: {
    numero: string;
    tipo: "MEDICAMENTO" | "ORDEN_TERAPIA";
    fecha: Date;
    medico: string;
    vencimiento?: Date | null;
    codigoVerificacion: string;
  },
  consultorio: DatosConsultorio
): CorreoGenerado {
  const esTerapia = receta.tipo === "ORDEN_TERAPIA";
  const filas: Array<[string, string]> = [
    ["Número", esc(receta.numero)],
    ["Tipo", esTerapia ? "Orden de terapia" : "Récipe de medicamentos"],
    ["Fecha", esc(fechaCorta(receta.fecha))],
    ["Emitido por", esc(receta.medico)],
  ];
  if (receta.vencimiento) filas.push(["Válido hasta", esc(fechaSinHora(receta.vencimiento))]);
  return correo({
    subject: `${esTerapia ? "Tu orden de terapia" : "Tu récipe médico"} ${receta.numero}`,
    titulo: esTerapia ? "Tu orden de terapia" : "Tu récipe médico",
    preencabezado: `Documento ${receta.numero} adjunto en PDF.`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo(`Te enviamos adjunto en PDF ${esTerapia ? "la orden de terapia" : "el récipe"} que se te indicó en consulta:`)}
      ${recuadro(filas)}
      ${parrafo("Puedes imprimirlo o mostrarlo desde tu teléfono en la farmacia o centro de terapia. El código QR permite verificar que es auténtico.")}
      ${boton("Verificar autenticidad", urlApp(`/verificar/${receta.codigoVerificacion}`))}
      ${nota("Sigue las indicaciones tal como fueron prescritas. Si tienes dudas o presentas alguna reacción, respóndenos este correo.")}`,
  });
}

export function constanciaEnviada(
  p: Persona,
  constancia: {
    numero: string;
    fecha: Date;
    medico: string;
    diasReposo?: number | null;
    inicioReposo?: Date | null;
    finReposo?: Date | null;
    codigoVerificacion: string;
  },
  consultorio: DatosConsultorio
): CorreoGenerado {
  const filas: Array<[string, string]> = [
    ["Número", esc(constancia.numero)],
    ["Fecha", esc(fechaCorta(constancia.fecha))],
    ["Emitida por", esc(constancia.medico)],
  ];
  if (constancia.diasReposo) {
    const rango =
      constancia.inicioReposo && constancia.finReposo
        ? ` (del ${fechaSinHora(constancia.inicioReposo)} al ${fechaSinHora(constancia.finReposo)})`
        : "";
    filas.push(["Reposo", esc(`${constancia.diasReposo} día(s)${rango}`)]);
  }
  return correo({
    subject: `Tu constancia médica ${constancia.numero}`,
    titulo: "Tu constancia médica",
    preencabezado: `Constancia ${constancia.numero} adjunta en PDF.`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo("Te enviamos adjunta en PDF tu constancia médica:")}
      ${recuadro(filas)}
      ${parrafo("Puedes presentarla impresa o digital. Quien la reciba puede verificar su autenticidad escaneando el código QR o con este enlace:")}
      ${boton("Verificar autenticidad", urlApp(`/verificar/${constancia.codigoVerificacion}`))}`,
  });
}

export function planEjerciciosEnviado(
  p: Persona,
  plan: {
    fecha: Date;
    medico: string;
    notas?: string | null;
    items: Array<{ nombre: string; descripcion?: string | null; repeticionesSugeridas?: string | null }>;
  },
  consultorio: DatosConsultorio
): CorreoGenerado {
  return correo({
    subject: "Tu guía de ejercicios para casa",
    titulo: "Tu guía de ejercicios",
    preencabezado: `${plan.items.length} ejercicio(s) indicados por ${plan.medico}.`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo(`Estos son los ejercicios que ${esc(plan.medico)} te indicó el ${esc(fechaCorta(plan.fecha))}. También los tienes adjuntos en PDF para imprimirlos.`)}
      ${lista(
        plan.items.map((i) => {
          const partes: string[] = [];
          if (i.descripcion) partes.push(esc(i.descripcion));
          if (i.repeticionesSugeridas) partes.push(`<em>${esc(i.repeticionesSugeridas)}</em>`);
          const detalle = partes.join(" · ");
          return `<strong>${esc(i.nombre)}</strong>${detalle ? `<br><span style="color:#4c6478;font-size:14px;">${detalle}</span>` : ""}`;
        })
      )}
      ${plan.notas ? recuadro([["Indicaciones", esc(plan.notas)]]) : ""}
      ${recuadro(
        [
          ["Antes", "Calienta 5 minutos con movimientos suaves."],
          ["Durante", "Muévete sin dolor intenso; una molestia leve es normal."],
          ["Si duele", "Detente y coméntalo en tu próxima sesión."],
        ],
        "Recomendaciones"
      )}
      ${nota("¿Tienes dudas sobre algún ejercicio? Respóndenos este correo.")}`,
  });
}

// ---------- Facturación ----------

const METODO_PAGO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  SEGURO: "Seguro",
  TRANSFERENCIA: "Transferencia",
  PAGO_MOVIL: "Pago móvil",
  ZELLE: "Zelle",
};

type Monto = number | string | { toString(): string };

export function facturaEnviada(
  p: Persona,
  factura: {
    numero: string;
    fecha: Date;
    total: Monto;
    montoAseguradora?: Monto | null;
    montoPaciente: Monto;
    pagado: Monto;
    saldo: Monto;
    aseguradora?: string | null;
    detalles: Array<{ descripcion: string; cantidad: number; subtotal: Monto }>;
  },
  consultorio: DatosConsultorio
): CorreoGenerado {
  const filas: Array<[string, string]> = [
    ["Factura", esc(factura.numero)],
    ["Fecha", esc(fechaCorta(factura.fecha))],
    ["Total", esc(usd(factura.total))],
  ];
  if (factura.montoAseguradora != null) {
    filas.push([`Cubre ${factura.aseguradora ?? "el seguro"}`, esc(usd(factura.montoAseguradora))]);
    filas.push(["A tu cargo", esc(usd(factura.montoPaciente))]);
  }
  filas.push(["Pagado", esc(usd(factura.pagado))]);
  const saldo = Number(factura.saldo.toString());
  if (saldo > 0) filas.push(["Saldo pendiente", `<span style="color:#c05468;">${esc(usd(factura.saldo))}</span>`]);

  return correo({
    subject: `Factura ${factura.numero} — LilyMedical`,
    titulo: "Tu factura",
    preencabezado: `Total ${usd(factura.total)}${saldo > 0 ? ` · saldo pendiente ${usd(factura.saldo)}` : " · pagada"}`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo("Te enviamos adjunta en PDF la factura por los servicios recibidos:")}
      ${lista(factura.detalles.map((d) => `${esc(d.descripcion)} × ${d.cantidad} — ${esc(usd(d.subtotal))}`))}
      ${recuadro(filas)}
      ${saldo > 0 ? parrafo("Puedes cancelar el saldo en tu próxima visita o por transferencia / pago móvil. Si pagas a distancia, respóndenos este correo con el comprobante.") : parrafo("¡Gracias! Esta factura está pagada en su totalidad.")}`,
  });
}

export function pagoRecibido(
  p: Persona,
  pago: {
    numeroFactura: string;
    monto: Monto;
    metodo: string;
    fecha: Date;
    referencia?: string | null;
    montoBs?: Monto | null;
    tasaCambio?: Monto | null;
    saldo: Monto;
  },
  consultorio: DatosConsultorio
): CorreoGenerado {
  const filas: Array<[string, string]> = [
    ["Monto", esc(usd(pago.monto))],
  ];
  if (pago.montoBs != null && pago.tasaCambio != null) {
    const bs = Number(pago.montoBs.toString()).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tasa = Number(pago.tasaCambio.toString()).toLocaleString("es-VE");
    filas.push(["En bolívares", esc(`Bs. ${bs} (tasa ${tasa} Bs/$)`)]);
  }
  filas.push(["Método", esc(METODO_PAGO[pago.metodo] ?? pago.metodo)]);
  if (pago.referencia) filas.push(["Referencia", esc(pago.referencia)]);
  filas.push(["Fecha", esc(fechaCorta(pago.fecha))]);
  filas.push(["Factura", esc(pago.numeroFactura)]);
  const saldo = Number(pago.saldo.toString());
  filas.push(["Saldo pendiente", saldo > 0 ? esc(usd(pago.saldo)) : "Pagada ✓"]);

  return correo({
    subject: `Recibimos tu pago de ${usd(pago.monto)}`,
    titulo: "¡Gracias! Recibimos tu pago",
    preencabezado: `${usd(pago.monto)} aplicado a la factura ${pago.numeroFactura}.`,
    consultorio,
    cuerpo: `
      ${parrafo(`Hola ${esc(p.nombres)},`)}
      ${parrafo("Registramos el siguiente pago:")}
      ${recuadro(filas, "Comprobante de pago")}
      ${nota("Guarda este correo como comprobante. Si ves algún dato incorrecto, respóndenos este mensaje.")}`,
  });
}
