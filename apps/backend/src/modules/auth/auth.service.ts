import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { HttpError } from "../../lib/http-error";
import { LoginInput, RegisterInput } from "./auth.schema";

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
