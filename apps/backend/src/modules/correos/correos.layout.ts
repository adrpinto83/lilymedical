// Piezas comunes de las plantillas de correo: todo con estilos en línea y
// tablas, que es lo único que Gmail, Outlook y los clientes móviles
// respetan de forma consistente.

export interface DatosConsultorio {
  nombreMedico: string; // "Dra. Lilia Figuera"
  titulo?: string | null; // "Médico Fisiatra"
  direccion?: string | null;
  telefono?: string | null;
  instagram?: string | null;
}

export interface CorreoGenerado {
  subject: string;
  html: string;
  text: string;
}

const COLOR = {
  tinta: "#15304a",
  gris: "#4c6478",
  grisClaro: "#dbe7ee",
  fondo: "#f4f7f9",
  rosa: "#c05468",
  salvia: "#7c8c81",
  salviaClaro: "#eef2ef",
};

export const ZONA_HORARIA = process.env.ZONA_HORARIA || "America/Caracas";

export function urlApp(ruta = ""): string {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${base}${ruta}`;
}

// Todo dato que venga de la base (nombres, notas, diagnósticos...) pasa por
// aquí antes de entrar al HTML.
export function esc(valor: string | number | null | undefined): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Las fechas se muestran en la hora del consultorio, no en la del servidor
// (el VPS puede estar en UTC).
export function fechaLarga(fecha: Date): string {
  const texto = fecha.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function fechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  });
}

// Para campos que son fecha sin hora (guardados a medianoche UTC, como los
// días de reposo): en la zona del consultorio (UTC-4) se verían un día antes.
export function fechaSinHora(fecha: Date): string {
  return fecha.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export function hora(fecha: Date): string {
  return fecha.toLocaleTimeString("es-VE", { hour: "numeric", minute: "2-digit", timeZone: ZONA_HORARIA });
}

export function usd(valor: number | string | { toString(): string }): string {
  return `$${Number(valor.toString()).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parrafo(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLOR.tinta};">${html}</p>`;
}

export function nota(html: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${COLOR.gris};">${html}</p>`;
}

export function boton(texto: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
      <tr><td style="border-radius:8px;background:${COLOR.rosa};">
        <a href="${esc(url)}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(texto)}</a>
      </td></tr>
    </table>`;
}

// Recuadro destacado con pares etiqueta/valor (fecha, hora, número de
// documento...). Los valores ya deben venir escapados.
export function recuadro(filas: Array<[string, string]>, titulo?: string): string {
  const contenido = filas
    .map(
      ([etiqueta, valor]) => `
        <tr>
          <td style="padding:5px 0;font-size:13px;color:${COLOR.gris};width:38%;vertical-align:top;">${esc(etiqueta)}</td>
          <td style="padding:5px 0;font-size:15px;color:${COLOR.tinta};font-weight:bold;">${valor}</td>
        </tr>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:${COLOR.salviaClaro};border-left:4px solid ${COLOR.salvia};border-radius:6px;">
      <tr><td style="padding:14px 18px;">
        ${titulo ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:${COLOR.salvia};font-weight:bold;">${esc(titulo)}</p>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${contenido}</table>
      </td></tr>
    </table>`;
}

export function lista(items: string[]): string {
  return `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:${COLOR.tinta};">${items
    .map((i) => `<li style="margin-bottom:4px;">${i}</li>`)
    .join("")}</ul>`;
}

function pie(consultorio: DatosConsultorio): string {
  const lineas: string[] = [];
  if (consultorio.direccion) lineas.push(`📍 ${esc(consultorio.direccion)}`);
  if (consultorio.telefono) lineas.push(`📞 ${esc(consultorio.telefono)}`);
  if (consultorio.instagram) {
    const handle = consultorio.instagram.replace(/^@/, "").trim();
    lineas.push(
      `📷 <a href="https://www.instagram.com/${esc(handle)}" style="color:${COLOR.gris};">@${esc(handle)}</a>`
    );
  }
  lineas.push(`🌐 <a href="${esc(urlApp())}" style="color:${COLOR.gris};">${esc(urlApp().replace(/^https?:\/\//, ""))}</a>`);

  return `
    <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:${COLOR.tinta};">${esc(consultorio.nombreMedico)}</p>
    ${consultorio.titulo ? `<p style="margin:0 0 8px;font-size:13px;color:${COLOR.gris};">${esc(consultorio.titulo)}</p>` : ""}
    <p style="margin:0;font-size:13px;line-height:1.7;color:${COLOR.gris};">${lineas.join("<br>")}</p>`;
}

/**
 * Envuelve el contenido en el diseño de marca. `preencabezado` es el texto
 * que los clientes de correo muestran junto al asunto en la bandeja.
 */
export function layout(opciones: {
  titulo: string;
  preencabezado: string;
  cuerpo: string;
  consultorio: DatosConsultorio;
}): string {
  const { titulo, preencabezado, cuerpo, consultorio } = opciones;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.fondo};font-family:Arial,Helvetica,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preencabezado)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.fondo};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${COLOR.grisClaro};">
      <tr><td style="padding:22px 28px;border-bottom:3px solid ${COLOR.rosa};">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;padding-right:12px;"><img src="${esc(urlApp("/logo-icon.png"))}" width="44" alt="" style="display:block;border:0;"></td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:20px;font-weight:bold;color:${COLOR.tinta};">LilyMedical</p>
            <p style="margin:0;font-size:12px;color:${COLOR.salvia};">Fisiatría y rehabilitación</p>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:${COLOR.tinta};">${esc(titulo)}</h1>
        ${cuerpo}
      </td></tr>
      <tr><td style="padding:20px 28px;background:${COLOR.fondo};border-top:1px solid ${COLOR.grisClaro};">
        ${pie(consultorio)}
      </td></tr>
    </table>
    <p style="max-width:560px;margin:14px auto 0;font-size:11px;line-height:1.5;color:${COLOR.gris};text-align:center;">
      Recibes este correo porque eres paciente o usuario de LilyMedical. Si tienes alguna duda, simplemente responde a este mensaje.
    </p>
  </td></tr>
</table>
</body>
</html>`;
}

// Versión en texto plano derivada del HTML, suficiente para clientes sin
// HTML y para los filtros de spam.
export function htmlATexto(html: string): string {
  return html
    .replace(/<span style="display:none[^>]*>[\s\S]*?<\/span>/, "")
    .replace(/<head>[\s\S]*?<\/head>/, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, "$2 ($1)")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(p|h1|tr|li|table)>/g, "\n")
    .replace(/<li[^>]*>/g, "• ")
    .replace(/<\/td>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

export function correo(opciones: {
  subject: string;
  titulo: string;
  preencabezado: string;
  cuerpo: string;
  consultorio: DatosConsultorio;
}): CorreoGenerado {
  const html = layout(opciones);
  return { subject: opciones.subject, html, text: htmlATexto(html) };
}
