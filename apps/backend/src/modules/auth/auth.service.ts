import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { HttpError } from "../../lib/http-error";
import { LoginInput, RegisterInput, RegistroPacienteInput } from "./auth.schema";

export async function login({ email, password }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.activo) {
    throw new HttpError(401, "Credenciales inválidas");
  }

  const valido = await bcrypt.compare(password, usuario.passwordHash);
  if (!valido) {
    throw new HttpError(401, "Credenciales inválidas");
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

// Alta del portal del paciente: el paciente exige que el consultorio ya
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

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
  };
}
