import jwt, { SignOptions } from "jsonwebtoken";
import { RolUsuario } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
  nombre: string;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no está configurado");
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no está configurado");
  return jwt.verify(token, secret) as JwtPayload;
}
