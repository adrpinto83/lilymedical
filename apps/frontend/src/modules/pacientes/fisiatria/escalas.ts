// Escalas y catálogos de fisiatría: definiciones, puntuación e interpretación.
// Lo que se guarda en `EvaluacionFisiatrica.datos` sigue estas formas:
//   EVA             { caracter?, puntosDolor?, interpretacion }
//   BARTHEL         { items: { [clave]: puntos }, interpretacion }
//   OSWESTRY        { items: { [clave]: 0-5 | null }, interpretacion }
//   GONIOMETRICA    { mediciones: [{ articulacion, movimiento, lado, grados, normal }] }
//   FUERZA_MUSCULAR { mediciones: [{ grupo, lado, grado }] }
// El PDF de la historia (backend) lee `interpretacion` y `mediciones`.

export type TipoEscalaFisiatria =
  | "EVA"
  | "BARTHEL"
  | "OSWESTRY"
  | "GONIOMETRICA"
  | "FUERZA_MUSCULAR"
  | "PERSONALIZADA";

export const ESCALAS: { value: TipoEscalaFisiatria; label: string; ayuda: string }[] = [
  { value: "EVA", label: "Escala Visual Análoga (dolor)", ayuda: "Intensidad del dolor de 0 a 10" },
  { value: "BARTHEL", label: "Índice de Barthel", ayuda: "Independencia en actividades de la vida diaria (0-100)" },
  { value: "OSWESTRY", label: "Índice de Oswestry", ayuda: "Discapacidad por dolor lumbar (%)" },
  { value: "GONIOMETRICA", label: "Evaluación goniométrica", ayuda: "Rango de movimiento articular en grados" },
  { value: "FUERZA_MUSCULAR", label: "Fuerza muscular (Daniels)", ayuda: "Examen muscular manual de 0 a 5" },
  { value: "PERSONALIZADA", label: "Escala personalizada", ayuda: "Otra escala con puntaje libre" },
];

export function etiquetaEscala(tipo: string, nombre?: string | null) {
  if (tipo === "PERSONALIZADA" && nombre) return nombre;
  return ESCALAS.find((e) => e.value === tipo)?.label ?? tipo;
}

// ------------------------------------------------------------------ EVA

export function interpretarEva(valor: number) {
  if (valor === 0) return "Sin dolor";
  if (valor <= 3) return "Dolor leve";
  if (valor <= 6) return "Dolor moderado";
  return "Dolor severo";
}

export const CARACTER_DOLOR = [
  "Mecánico",
  "Inflamatorio",
  "Neuropático / irradiado",
  "Punzante",
  "Urente (quemante)",
  "Opresivo",
  "Calambre",
];

// -------------------------------------------------------------- Barthel

export interface ItemEscala {
  clave: string;
  titulo: string;
  opciones: { puntos: number; texto: string }[];
}

export const BARTHEL: ItemEscala[] = [
  {
    clave: "comer",
    titulo: "Comer",
    opciones: [
      { puntos: 10, texto: "Independiente" },
      { puntos: 5, texto: "Necesita ayuda para cortar, untar, etc." },
      { puntos: 0, texto: "Dependiente" },
    ],
  },
  {
    clave: "banarse",
    titulo: "Bañarse",
    opciones: [
      { puntos: 5, texto: "Independiente (entra y sale solo)" },
      { puntos: 0, texto: "Dependiente" },
    ],
  },
  {
    clave: "vestirse",
    titulo: "Vestirse",
    opciones: [
      { puntos: 10, texto: "Independiente (botones, cierres, zapatos)" },
      { puntos: 5, texto: "Necesita ayuda" },
      { puntos: 0, texto: "Dependiente" },
    ],
  },
  {
    clave: "arreglarse",
    titulo: "Arreglarse (aseo personal)",
    opciones: [
      { puntos: 5, texto: "Independiente (cara, cabello, dientes, afeitarse)" },
      { puntos: 0, texto: "Necesita ayuda" },
    ],
  },
  {
    clave: "deposiciones",
    titulo: "Deposiciones",
    opciones: [
      { puntos: 10, texto: "Continente" },
      { puntos: 5, texto: "Accidente ocasional" },
      { puntos: 0, texto: "Incontinente" },
    ],
  },
  {
    clave: "miccion",
    titulo: "Micción",
    opciones: [
      { puntos: 10, texto: "Continente" },
      { puntos: 5, texto: "Accidente ocasional" },
      { puntos: 0, texto: "Incontinente o sondado" },
    ],
  },
  {
    clave: "retrete",
    titulo: "Uso del retrete",
    opciones: [
      { puntos: 10, texto: "Independiente" },
      { puntos: 5, texto: "Necesita alguna ayuda" },
      { puntos: 0, texto: "Dependiente" },
    ],
  },
  {
    clave: "traslado",
    titulo: "Traslado sillón-cama",
    opciones: [
      { puntos: 15, texto: "Independiente" },
      { puntos: 10, texto: "Mínima ayuda o supervisión" },
      { puntos: 5, texto: "Gran ayuda, pero se sienta solo" },
      { puntos: 0, texto: "Dependiente" },
    ],
  },
  {
    clave: "deambulacion",
    titulo: "Deambulación",
    opciones: [
      { puntos: 15, texto: "Independiente 50 m (puede usar bastón)" },
      { puntos: 10, texto: "Con ayuda 50 m" },
      { puntos: 5, texto: "Independiente en silla de ruedas" },
      { puntos: 0, texto: "Dependiente" },
    ],
  },
  {
    clave: "escaleras",
    titulo: "Subir y bajar escaleras",
    opciones: [
      { puntos: 10, texto: "Independiente" },
      { puntos: 5, texto: "Necesita ayuda o supervisión" },
      { puntos: 0, texto: "Incapaz" },
    ],
  },
];

export function puntajeBarthel(items: Record<string, number | undefined>) {
  return BARTHEL.reduce((total, item) => total + (items[item.clave] ?? 0), 0);
}

/** Grado de dependencia según Shah (1989). */
export function interpretarBarthel(total: number) {
  if (total === 100) return "Independiente";
  if (total >= 91) return "Dependencia escasa";
  if (total >= 61) return "Dependencia moderada";
  if (total >= 21) return "Dependencia severa";
  return "Dependencia total";
}

// ------------------------------------------------------------- Oswestry

const opcionesOswestry = (textos: string[]) => textos.map((texto, puntos) => ({ puntos, texto }));

export const OSWESTRY: ItemEscala[] = [
  {
    clave: "dolor",
    titulo: "1. Intensidad del dolor",
    opciones: opcionesOswestry([
      "Puedo soportar el dolor sin tomar calmantes",
      "El dolor es fuerte pero me arreglo sin calmantes",
      "Los calmantes me alivian completamente el dolor",
      "Los calmantes me alivian un poco el dolor",
      "Los calmantes apenas me alivian el dolor",
      "Los calmantes no me alivian el dolor y no los tomo",
    ]),
  },
  {
    clave: "cuidados",
    titulo: "2. Cuidados personales",
    opciones: opcionesOswestry([
      "Me las arreglo solo sin que me aumente el dolor",
      "Me las arreglo solo pero esto me aumenta el dolor",
      "Lavarme, vestirme, etc. me produce dolor y tengo que hacerlo despacio",
      "Necesito alguna ayuda pero hago la mayoría de las cosas solo",
      "Necesito ayuda para hacer la mayoría de las cosas",
      "No puedo vestirme, me cuesta lavarme y suelo quedarme en la cama",
    ]),
  },
  {
    clave: "levantarPeso",
    titulo: "3. Levantar peso",
    opciones: opcionesOswestry([
      "Puedo levantar objetos pesados sin que me aumente el dolor",
      "Puedo levantar objetos pesados pero me aumenta el dolor",
      "No puedo levantar objetos pesados del suelo, pero sí desde una mesa",
      "No puedo levantar objetos pesados, pero sí ligeros o medianos desde una mesa",
      "Sólo puedo levantar objetos muy ligeros",
      "No puedo levantar ni cargar ningún objeto",
    ]),
  },
  {
    clave: "andar",
    titulo: "4. Andar",
    opciones: opcionesOswestry([
      "El dolor no me impide andar",
      "El dolor me impide andar más de 1 km",
      "El dolor me impide andar más de 500 m",
      "El dolor me impide andar más de 250 m",
      "Sólo puedo andar con bastón o muletas",
      "Permanezco en la cama casi todo el tiempo",
    ]),
  },
  {
    clave: "sentado",
    titulo: "5. Estar sentado",
    opciones: opcionesOswestry([
      "Puedo estar sentado en cualquier silla el tiempo que quiera",
      "Puedo estar sentado en mi silla favorita el tiempo que quiera",
      "El dolor me impide estar sentado más de una hora",
      "El dolor me impide estar sentado más de media hora",
      "El dolor me impide estar sentado más de diez minutos",
      "El dolor me impide estar sentado",
    ]),
  },
  {
    clave: "dePie",
    titulo: "6. Estar de pie",
    opciones: opcionesOswestry([
      "Puedo estar de pie el tiempo que quiera sin que me aumente el dolor",
      "Puedo estar de pie el tiempo que quiera pero me aumenta el dolor",
      "El dolor me impide estar de pie más de una hora",
      "El dolor me impide estar de pie más de media hora",
      "El dolor me impide estar de pie más de diez minutos",
      "El dolor me impide estar de pie",
    ]),
  },
  {
    clave: "dormir",
    titulo: "7. Dormir",
    opciones: opcionesOswestry([
      "El dolor no me impide dormir bien",
      "Sólo puedo dormir si tomo pastillas",
      "Incluso tomando pastillas duermo menos de seis horas",
      "Incluso tomando pastillas duermo menos de cuatro horas",
      "Incluso tomando pastillas duermo menos de dos horas",
      "El dolor me impide totalmente dormir",
    ]),
  },
  {
    clave: "sexual",
    titulo: "8. Actividad sexual (opcional)",
    opciones: opcionesOswestry([
      "Es normal y no me aumenta el dolor",
      "Es normal pero me aumenta el dolor",
      "Es casi normal pero me aumenta mucho el dolor",
      "Se ha visto muy limitada a causa del dolor",
      "Es casi nula a causa del dolor",
      "El dolor me impide todo tipo de actividad sexual",
    ]),
  },
  {
    clave: "social",
    titulo: "9. Vida social",
    opciones: opcionesOswestry([
      "Es normal y no me aumenta el dolor",
      "Es normal pero me aumenta el dolor",
      "El dolor sólo me impide actividades enérgicas (bailar, deporte)",
      "El dolor ha limitado mi vida social y no salgo tan a menudo",
      "El dolor ha limitado mi vida social al hogar",
      "No tengo vida social a causa del dolor",
    ]),
  },
  {
    clave: "viajar",
    titulo: "10. Viajar",
    opciones: opcionesOswestry([
      "Puedo viajar a cualquier sitio sin que me aumente el dolor",
      "Puedo viajar a cualquier sitio pero me aumenta el dolor",
      "El dolor es fuerte pero aguanto viajes de más de dos horas",
      "El dolor me limita a viajes de menos de una hora",
      "El dolor me limita a viajes cortos de menos de media hora",
      "El dolor me impide viajar excepto para ir al médico",
    ]),
  },
];

/**
 * Porcentaje de discapacidad: suma / (5 × secciones respondidas) × 100. Las
 * secciones sin responder (p. ej. la sexual) no cuentan. null si no hay ninguna.
 */
export function puntajeOswestry(items: Record<string, number | null | undefined>) {
  const respondidas = OSWESTRY.map((i) => items[i.clave]).filter((v): v is number => typeof v === "number");
  if (respondidas.length === 0) return null;
  const suma = respondidas.reduce((a, b) => a + b, 0);
  return Math.round((suma / (5 * respondidas.length)) * 100);
}

export function interpretarOswestry(porcentaje: number) {
  if (porcentaje <= 20) return "Limitación funcional mínima";
  if (porcentaje <= 40) return "Limitación funcional moderada";
  if (porcentaje <= 60) return "Limitación funcional intensa";
  if (porcentaje <= 80) return "Discapacidad";
  return "Limitación funcional máxima";
}

// ----------------------------------------------------------- Goniometría

// Valores de referencia en grados (AAOS) para comparar el rango medido.
export const GONIOMETRIA: { articulacion: string; movimientos: { nombre: string; normal: number }[] }[] = [
  {
    articulacion: "Columna cervical",
    movimientos: [
      { nombre: "Flexión", normal: 45 },
      { nombre: "Extensión", normal: 45 },
      { nombre: "Inclinación lateral", normal: 45 },
      { nombre: "Rotación", normal: 60 },
    ],
  },
  {
    articulacion: "Columna lumbar",
    movimientos: [
      { nombre: "Flexión", normal: 60 },
      { nombre: "Extensión", normal: 25 },
      { nombre: "Inclinación lateral", normal: 25 },
      { nombre: "Rotación", normal: 30 },
    ],
  },
  {
    articulacion: "Hombro",
    movimientos: [
      { nombre: "Flexión", normal: 180 },
      { nombre: "Extensión", normal: 60 },
      { nombre: "Abducción", normal: 180 },
      { nombre: "Aducción", normal: 30 },
      { nombre: "Rotación interna", normal: 70 },
      { nombre: "Rotación externa", normal: 90 },
    ],
  },
  {
    articulacion: "Codo",
    movimientos: [
      { nombre: "Flexión", normal: 150 },
      { nombre: "Extensión", normal: 0 },
    ],
  },
  {
    articulacion: "Antebrazo",
    movimientos: [
      { nombre: "Pronación", normal: 80 },
      { nombre: "Supinación", normal: 80 },
    ],
  },
  {
    articulacion: "Muñeca",
    movimientos: [
      { nombre: "Flexión", normal: 80 },
      { nombre: "Extensión", normal: 70 },
      { nombre: "Desviación radial", normal: 20 },
      { nombre: "Desviación cubital", normal: 30 },
    ],
  },
  {
    articulacion: "Cadera",
    movimientos: [
      { nombre: "Flexión", normal: 120 },
      { nombre: "Extensión", normal: 30 },
      { nombre: "Abducción", normal: 45 },
      { nombre: "Aducción", normal: 30 },
      { nombre: "Rotación interna", normal: 45 },
      { nombre: "Rotación externa", normal: 45 },
    ],
  },
  {
    articulacion: "Rodilla",
    movimientos: [
      { nombre: "Flexión", normal: 135 },
      { nombre: "Extensión", normal: 0 },
    ],
  },
  {
    articulacion: "Tobillo",
    movimientos: [
      { nombre: "Dorsiflexión", normal: 20 },
      { nombre: "Flexión plantar", normal: 50 },
      { nombre: "Inversión", normal: 35 },
      { nombre: "Eversión", normal: 15 },
    ],
  },
];

export type Lado = "D" | "I" | "";

export const LADOS: { value: Lado; label: string }[] = [
  { value: "D", label: "Derecho" },
  { value: "I", label: "Izquierdo" },
  { value: "", label: "—" },
];

export function etiquetaLado(lado: string | undefined) {
  return lado === "D" ? "der." : lado === "I" ? "izq." : "";
}

export interface MedicionGoniometrica {
  articulacion: string;
  movimiento: string;
  lado: Lado;
  grados: number | null;
  normal: number | null;
}

/** Porcentaje del rango normal alcanzado (null si no aplica, p. ej. extensión 0°). */
export function porcentajeDelNormal(m: Pick<MedicionGoniometrica, "grados" | "normal">) {
  if (m.grados === null || !m.normal) return null;
  return Math.round((m.grados / m.normal) * 100);
}

// ------------------------------------------------------ Fuerza muscular

export const GRADOS_DANIELS: { grado: number; texto: string }[] = [
  { grado: 5, texto: "5 · Normal: vence resistencia máxima" },
  { grado: 4, texto: "4 · Buena: vence resistencia moderada" },
  { grado: 3, texto: "3 · Regular: vence la gravedad" },
  { grado: 2, texto: "2 · Mala: movimiento sin gravedad" },
  { grado: 1, texto: "1 · Vestigio: contracción sin movimiento" },
  { grado: 0, texto: "0 · Nula: sin contracción" },
];

export const GRUPOS_MUSCULARES = [
  "Flexores de cuello",
  "Extensores de cuello",
  "Flexores de hombro",
  "Abductores de hombro",
  "Rotadores externos de hombro",
  "Flexores de codo",
  "Extensores de codo",
  "Extensores de muñeca",
  "Flexores de muñeca",
  "Prensión",
  "Abdominales",
  "Extensores de tronco",
  "Flexores de cadera",
  "Extensores de cadera",
  "Abductores de cadera",
  "Aductores de cadera",
  "Extensores de rodilla (cuádriceps)",
  "Flexores de rodilla (isquiotibiales)",
  "Dorsiflexores de tobillo",
  "Flexores plantares",
];

export interface MedicionFuerza {
  grupo: string;
  lado: Lado;
  grado: number | null;
}

// ------------------------------------------------ Sesiones de tratamiento

// Agentes físicos y técnicas habituales del consultorio, para marcar en cada
// sesión. Se puede escribir cualquier otra.
export const MODALIDADES = [
  "Compresas calientes",
  "Crioterapia",
  "TENS",
  "Electroestimulación",
  "Corrientes interferenciales",
  "Ultrasonido",
  "Láser",
  "Magnetoterapia",
  "Onda corta",
  "Ondas de choque",
  "Parafina",
  "Tracción cervical",
  "Tracción lumbar",
  "Masoterapia",
  "Terapia manual",
  "Ejercicios terapéuticos",
  "Estiramientos",
  "Fortalecimiento",
  "Propiocepción",
  "Reeducación de la marcha",
  "Vendaje neuromuscular",
];

export const DOMINANCIAS = [
  { value: "DIESTRO", label: "Diestro" },
  { value: "ZURDO", label: "Zurdo" },
  { value: "AMBIDIESTRO", label: "Ambidiestro" },
];
