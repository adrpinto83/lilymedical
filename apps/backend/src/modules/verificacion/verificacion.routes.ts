import { Router } from "express";
import * as recetasService from "../recetas/recetas.service";
import * as constanciasService from "../constancias/constancias.service";

const router = Router();

// Endpoint público (sin autenticación): confirma que un documento emitido
// por LilyMedical es auténtico, sin exponer datos clínicos del paciente.
router.get("/:codigo", async (req, res) => {
  const { codigo } = req.params;

  const receta = await recetasService.obtenerRecetaPorCodigo(codigo);
  if (receta) {
    return res.json({
      valido: true,
      tipo: receta.tipo === "MEDICAMENTO" ? "Receta médica" : "Orden de terapia",
      numeroDocumento: receta.numeroReceta,
      fecha: receta.fecha,
      medico: `${receta.medico.nombre} ${receta.medico.apellido}`,
    });
  }

  const constancia = await constanciasService.obtenerConstanciaPorCodigo(codigo);
  if (constancia) {
    return res.json({
      valido: true,
      tipo: "Constancia médica",
      numeroDocumento: constancia.numeroConstancia,
      fecha: constancia.fecha,
      medico: `${constancia.medico.nombre} ${constancia.medico.apellido}`,
    });
  }

  res.status(404).json({ valido: false });
});

export default router;
