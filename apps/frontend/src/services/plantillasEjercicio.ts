import { api } from "./api";
import { PlantillaEjercicio } from "../types";

export async function listarPlantillasEjercicio(): Promise<PlantillaEjercicio[]> {
  const { data } = await api.get<PlantillaEjercicio[]>("/plantillas-ejercicio");
  return data;
}

export async function crearPlantillaEjercicio(payload: {
  nombre: string;
  categoria?: string;
  descripcion?: string;
  repeticionesSugeridas?: string;
}): Promise<PlantillaEjercicio> {
  const { data } = await api.post<PlantillaEjercicio>("/plantillas-ejercicio", payload);
  return data;
}
