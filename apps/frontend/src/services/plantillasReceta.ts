import { api } from "./api";
import { PlantillaReceta } from "../types";
import { ItemRecetaInput } from "./recetas";

export async function listarPlantillasReceta(): Promise<PlantillaReceta[]> {
  const { data } = await api.get<PlantillaReceta[]>("/plantillas-receta");
  return data;
}

export async function crearPlantillaReceta(
  payload: { tipo: PlantillaReceta["tipo"] } & ItemRecetaInput
): Promise<PlantillaReceta> {
  const { data } = await api.post<PlantillaReceta>("/plantillas-receta", payload);
  return data;
}

export async function eliminarPlantillaReceta(id: string): Promise<void> {
  await api.delete(`/plantillas-receta/${id}`);
}
