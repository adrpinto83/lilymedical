/**
 * Contenido editable de la landing pública.
 *
 * Se mantiene aparte del JSX para que los textos, servicios y datos de
 * contacto puedan corregirse sin tocar el maquetado. Los datos de contacto y
 * credenciales replican el membrete real del consultorio (el mismo que usa el
 * recetario y que el seed carga en `PerfilMedico`).
 */

export const doctora = {
  nombre: "Dra. Lilia Figuera",
  titulo: "Médico Fisiatra",
  tagline: "Fisiatra en Puerto La Cruz",
  mpps: "73.766",
  cma: "6.576",
  /** Foto grande del hero. Colocar en `public/dra-lilia.jpg`; si no existe se
   *  muestra el retrato de Instagram (ver `instagram.avatar`) como respaldo. */
  foto: "/dra-lilia.jpg",
} as const;

/**
 * Material tomado del perfil público de Instagram @dra.fisya.
 *
 * El retrato se descargó del perfil y se sirve desde `public/` en vez de
 * enlazar al CDN de Instagram: esas URLs van firmadas y caducan, así que un
 * enlace directo dejaría de cargar en pocos días. Es la única imagen que el
 * perfil expone sin sesión iniciada, y en su máxima resolución disponible
 * (150x150), por lo que solo debe usarse en tamaños pequeños o circulares.
 */
export const instagram = {
  avatar: "/instagram/perfil-dra-fisya.jpg",
  /** Biografía literal del perfil. */
  bio: "Dra. Lilia Figuera | Fisiatra en Puerto la Cruz",
  /** Instantánea del 23-09-2026; actualizar de tanto en tanto. */
  publicaciones: 172,
  seguidores: "1.594",
} as const;

export const contacto = {
  direccion: "Av. Stadium, C.C. Novocentro, PB local 08, Puerto La Cruz",
  telefono: "0414-7964640",
  /** Mismo número en formato internacional, para los enlaces tel: y wa.me */
  telefonoInternacional: "+584147964640",
  whatsapp: "584147964640",
  instagramUsuario: "@dra.fisya",
  instagramUrl: "https://www.instagram.com/dra.fisya/",
  mapaUrl:
    "https://www.google.com/maps/search/?api=1&query=C.C.+Novocentro+Av.+Stadium+Puerto+La+Cruz",
} as const;

/** Horario referencial: ajustar al horario real de consulta. */
export const horarios = [
  { dias: "Lunes a viernes", horas: "8:00 a. m. – 4:00 p. m." },
  { dias: "Sábados", horas: "8:00 a. m. – 12:00 m." },
  { dias: "Domingos y feriados", horas: "Cerrado" },
] as const;

/**
 * Las fotos de `src/assets/galeria/` son de archivo, con licencia libre, y
 * están solo mientras se consiguen las del consultorio (ver el CREDITOS.md de
 * esa carpeta). Al sustituirlas, poner esto en `false` para que desaparezca el
 * aviso bajo el carrusel.
 */
export const galeriaIlustrativa = true;

/**
 * Pies de foto de la galería, por nombre de archivo sin extensión. Existe
 * porque en un nombre de archivo conviene evitar tildes y eñes. Lo que no
 * aparezca aquí usa como pie su propio nombre de archivo.
 */
export const piesDeFoto: Record<string, string> = {
  "01-sesion-de-terapia-en-camilla": "Sesión de terapia guiada en camilla",
  "02-ejercicio-con-banda-elastica": "Ejercicio de fortalecimiento con banda elástica",
  "03-rehabilitacion-en-gimnasio": "Rehabilitación funcional acompañada",
  "04-evaluacion-manual-de-la-zona-lumbar": "Evaluación manual de la zona lumbar",
  "05-respiracion-y-postura-en-colchoneta": "Trabajo de respiración y postura en colchoneta",
};

/**
 * Las ilustraciones de `public/ilustraciones/` son obra original hecha para
 * este proyecto con la paleta de la marca: son SVG de ~1 KB, sin dependencias
 * ni licencias de terceros que atribuir, y se ven nítidas en cualquier pantalla.
 */
export const servicios = [
  {
    imagen: "/ilustraciones/consulta-fisiatria.svg",
    titulo: "Consulta de fisiatría",
    descripcion:
      "Evaluación médica completa del dolor y la limitación funcional: historia clínica, examen físico y un diagnóstico que explica qué está pasando y por qué.",
  },
  {
    imagen: "/ilustraciones/terapia-fisica.svg",
    titulo: "Terapia física",
    descripcion:
      "Programas de rehabilitación para lesiones musculoesqueléticas, dolor de columna, hombro y rodilla, y recuperación posoperatoria o posterior a un ACV.",
  },
  {
    imagen: "/ilustraciones/terapia-ocupacional.svg",
    titulo: "Terapia ocupacional",
    descripcion:
      "Reentrenamiento de las actividades del día a día para recuperar independencia en casa y en el trabajo, con adaptaciones pensadas para tu rutina.",
  },
  {
    imagen: "/ilustraciones/electroterapia.svg",
    titulo: "Electroterapia",
    descripcion:
      "Agentes físicos aplicados como apoyo del plan de rehabilitación para controlar el dolor y la inflamación y permitir que avances en tus ejercicios.",
  },
  {
    imagen: "/ilustraciones/ejercicios-casa.svg",
    titulo: "Plan de ejercicios en casa",
    descripcion:
      "Rutinas indicadas por la doctora, con series, repeticiones y frecuencia, disponibles en PDF desde tu portal para que no dependas de la memoria.",
  },
  {
    imagen: "/ilustraciones/informes-constancias.svg",
    titulo: "Informes y constancias",
    descripcion:
      "Récipes, órdenes de terapia y constancias médicas con firma y sello, verificables mediante código QR por tu empresa o aseguradora.",
  },
] as const;

export const beneficiosPortal = [
  {
    imagen: "/ilustraciones/portal-citas.svg",
    titulo: "Tus citas, siempre a la vista",
    descripcion:
      "Consulta la fecha y hora de tu próxima consulta y el historial de las anteriores. Te enviamos además un recordatorio por correo antes de cada cita.",
  },
  {
    imagen: "/ilustraciones/portal-ejercicios.svg",
    titulo: "Tu plan de ejercicios",
    descripcion:
      "Descarga en PDF las rutinas que la doctora te indicó, con series, repeticiones y frecuencia, para hacerlas bien en casa entre una terapia y otra.",
  },
  {
    imagen: "/ilustraciones/portal-documentos.svg",
    titulo: "Tus documentos en un solo lugar",
    descripcion:
      "Récipes, órdenes de terapia y constancias médicas listas para descargar cuando las necesites, sin tener que volver al consultorio por una copia.",
  },
  {
    imagen: "/ilustraciones/portal-resumen.svg",
    titulo: "Tu resumen clínico",
    descripcion:
      "Tu diagnóstico registrado y tus alergias siempre a mano, y la posibilidad de mantener al día tu teléfono y tu contacto de emergencia.",
  },
] as const;

/**
 * TESTIMONIOS DE EJEMPLO. Sustituir por opiniones reales, publicadas con la
 * autorización expresa del paciente; no deben presentarse como reales mientras
 * sean estos textos de muestra.
 */
export const testimonios = [
  {
    texto:
      "Llegué con un dolor de hombro que arrastraba desde hacía meses. Lo que más me ayudó fue entender qué tenía y salir con un plan claro de ejercicios para hacer en casa.",
    autor: "Paciente de rehabilitación de hombro",
    detalle: "Puerto La Cruz",
  },
  {
    texto:
      "Después de la operación de rodilla avancé paso a paso, con las terapias explicadas y revisando el progreso en cada consulta. Volví a subir escaleras sin miedo.",
    autor: "Paciente de recuperación posoperatoria",
    detalle: "Lechería",
  },
  {
    texto:
      "Poder ver mis récipes y mis constancias desde el teléfono me resolvió la vida con los trámites del seguro. No tuve que ir al consultorio por una copia.",
    autor: "Paciente del portal",
    detalle: "Barcelona, Anzoátegui",
  },
] as const;
