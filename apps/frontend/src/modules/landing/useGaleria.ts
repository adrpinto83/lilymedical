import { useEffect, useState } from "react";
import { FotoCarrusel } from "./Carrusel";
import { fotosGaleria } from "./fotos";
import { galeriaIlustrativa } from "./contenido";
import { listarGaleriaPublica } from "../../services/galeria";

/**
 * Fotos de la galería, con las del paquete como red de seguridad.
 *
 * Manda lo que haya cargado el consultorio desde la app; si todavía no ha
 * subido ninguna, o la API no responde, la landing sigue mostrando las fotos
 * incluidas en `src/assets/galeria/` en vez de quedarse con un hueco.
 */
export function useGaleria(): { fotos: FotoCarrusel[]; ilustrativa: boolean } {
  const [fotos, setFotos] = useState<FotoCarrusel[]>(fotosGaleria);
  const [ilustrativa, setIlustrativa] = useState(galeriaIlustrativa);

  useEffect(() => {
    let vigente = true;
    listarGaleriaPublica()
      .then((remotas) => {
        if (!vigente || remotas.length === 0) return;
        setFotos(remotas.map((foto) => ({ url: foto.url, alt: foto.pie })));
        setIlustrativa(false);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  return { fotos, ilustrativa };
}
