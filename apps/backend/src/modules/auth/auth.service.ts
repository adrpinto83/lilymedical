import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { HttpError } from "../../lib/http-error";
import {
  CambiarPasswordInput,
  LoginInput,
  RegisterInput,
  RegistroPacienteInput,
  RestablecerPasswordInput,
} from "./auth.schema";
import * as correos from "../correos/correos.service";
import { urlApp } from "../correos/correos.layout";

// Protección contra fuerza bruta (Fase 13): tras LOGIN_MAX_INTENTOS contraseñas
// incorrectas consecutivas, la cuenta queda bloqueada por LOGIN_BLOQUEO_MINUTOS.
function maxIntentos(): number {
  const valor = Number(process.env.LOGIN_MAX_INTENTOS);
  return Number.isFinite(valor) && valor > 0 ? valor : 5;
}

function bloqueoMinutos(): number {
  const valor = Number(process.env.LOGIN_BLOQUEO_MINUTOS);
  return Number.isFinite(valor) && valor > 0 ? valor : 15;
}

export async function login({ email, password }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.activo) {
    throw new HttpError(401, "Credenciales inválidas");
  }

  if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    const minutosRestantes = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60000);
    throw new HttpError(
      423,
      `Cuenta bloqueada temporalmente por demasiados intentos fallidos. Vuelve a intentar en ${minutosRestantes} minuto(s).`
    );
  }

  const valido = await bcrypt.compare(password, usuario.passwordHash);
  if (!valido) {
    const intentos = usuario.intentosFallidos + 1;
    const bloquear = intentos >= maxIntentos();
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        intentosFallidos: bloquear ? 0 : intentos,
        bloqueadoHasta: bloquear ? new Date(Date.now() + bloqueoMinutos() * 60000) : null,
      },
    });
    if (bloquear) {
      correos.enSegundoPlano("cuenta bloqueada", () => correos.notificarCuentaBloqueada(usuario.id, bloqueoMinutos()));
      throw new HttpError(
        423,
        `Cuenta bloqueada temporalmente por demasiados intentos fallidos. Vuelve a intentar en ${bloqueoMinutos()} minuto(s).`
      );
    }
    throw new HttpError(401, "Credenciales inválidas");
  }

  if (usuario.intentosFallidos > 0 || usuario.bloqueadoHasta) {
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });
  }

  const token = signToken({
    sub: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    nombre: `${usuario.nombre} ${usuario.apellido}`,
  });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

// Datos frescos del usuario autenticado (a diferencia del payload del JWT,
// que queda "congelado" con el nombre que tenía al iniciar sesión).
export async function obtenerPerfilActual(usuarioId: string) {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
  };
}

// Registro en el portal del paciente: el paciente exige que el consultorio ya
// haya creado la ficha clínica de antemano; aquí solo se crea el login que
// la vincula, validando cédula + email contra lo que el consultorio tiene
// registrado.
export async function registrarPaciente(data: RegistroPacienteInput) {
  const paciente = await prisma.paciente.findUnique({
    where: { documento: data.documento },
    include: { usuarioPortal: true },
  });
  if (!paciente) {
    throw new HttpError(404, "No encontramos un paciente con esa cédula. Contacta al consultorio.");
  }
  if (!paciente.email || paciente.email.trim().toLowerCase() !== data.email.trim().toLowerCase()) {
    throw new HttpError(400, "El email no coincide con el que el consultorio tiene registrado.");
  }
  if (paciente.usuarioPortal) {
    throw new HttpError(409, "Ya existe una cuenta para este paciente. Inicia sesión.");
  }

  const emailEnUso = await prisma.usuario.findUnique({ where: { email: data.email } });
  if (emailEnUso) {
    throw new HttpError(409, "Ya existe una cuenta con ese email.");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nombre: paciente.nombres,
      apellido: paciente.apellidos,
      email: data.email,
      passwordHash,
      rol: "PACIENTE",
      pacienteId: paciente.id,
    },
  });
  correos.enSegundoPlano("portal activado", () => correos.notificarPortalActivado(usuario.id));

  const token = signToken({
    sub: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    nombre: `${usuario.nombre} ${usuario.apellido}`,
  });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

export async function register(data: RegisterInput) {
  const existente = await prisma.usuario.findUnique({ where: { email: data.email } });
  if (existente) {
    throw new HttpError(409, "Ya existe un usuario con ese email");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      passwordHash,
      rol: data.rol,
      especialidad: data.especialidad,
    },
  });
  correos.enSegundoPlano("cuenta creada", () => correos.notificarCuentaPersonalCreada(usuario.id));

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
  };
}

/**
 * Cambio de contraseña por parte del propio usuario.
 *
 * Exige la contraseña actual para que una sesión robada no baste para
 * secuestrar la cuenta, y de paso limpia el bloqueo por intentos fallidos.
 */
export async function cambiarPassword(usuarioId: string, { actual, nueva }: CambiarPasswordInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new HttpError(404, "Usuario no encontrado");

  const coincide = await bcrypt.compare(actual, usuario.passwordHash);
  if (!coincide) throw new HttpError(400, "La contraseña actual no es correcta");
  if (actual === nueva) {
    throw new HttpError(400, "La nueva contraseña debe ser distinta de la actual");
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      passwordHash: await bcrypt.hash(nueva, 10),
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });
  correos.enSegundoPlano("contraseña cambiada", () => correos.notificarPasswordCambiada(usuarioId, false));
}

// ---------- Olvidé mi contraseña ----------

const RESTABLECER_MINUTOS = 60;

// El enlace se firma con el hash actual de la contraseña: en cuanto se usa
// (o la contraseña cambia por otra vía) deja de ser válido, sin necesidad de
// guardar tokens en la base de datos.
function secretoRestablecimiento(passwordHash: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no está configurado");
  return `${secret}:restablecer:${passwordHash}`;
}

/**
 * Envía el enlace para elegir una nueva contraseña. No revela si el email
 * existe: la respuesta es la misma en todos los casos y el envío ocurre en
 * segundo plano.
 */
export async function solicitarRestablecimiento(email: string) {
  const usuario = await prisma.usuario.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });
  if (!usuario || !usuario.activo || usuario.eliminadoEn) return;

  const token = jwt.sign({ sub: usuario.id }, secretoRestablecimiento(usuario.passwordHash), {
    expiresIn: `${RESTABLECER_MINUTOS}m`,
  });
  const url = urlApp(`/restablecer-password?token=${encodeURIComponent(token)}`);
  correos.enSegundoPlano("restablecer contraseña", () =>
    correos.enviarEnlaceRestablecimiento(usuario, url, RESTABLECER_MINUTOS)
  );
}

export async function restablecerPassword({ token, nueva }: RestablecerPasswordInput) {
  const invalido = new HttpError(400, "El enlace no es válido o ya venció. Solicita uno nuevo.");
  const decodificado = jwt.decode(token);
  const usuarioId = decodificado && typeof decodificado === "object" ? decodificado.sub : undefined;
  if (!usuarioId) throw invalido;

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !usuario.activo || usuario.eliminadoEn) throw invalido;
  try {
    jwt.verify(token, secretoRestablecimiento(usuario.passwordHash));
  } catch {
    throw invalido;
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash: await bcrypt.hash(nueva, 10),
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });
  correos.enSegundoPlano("contraseña cambiada", () => correos.notificarPasswordCambiada(usuario.id, false));
}
