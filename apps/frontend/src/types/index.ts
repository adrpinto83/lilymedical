export type RolUsuario = "MEDICO" | "ADMINISTRATIVO" | "PACIENTE";
export type SexoPaciente = "MASCULINO" | "FEMENINO" | "OTRO";
export type EstadoCita = "PROGRAMADA" | "CONFIRMADA" | "ATENDIDA" | "CANCELADA" | "NO_ASISTIO";
export type EstadoFactura = "PENDIENTE" | "PAGADA" | "PARCIAL" | "ANULADA";
export type MetodoPago = "EFECTIVO" | "TARJETA" | "SEGURO" | "TRANSFERENCIA";
export type TipoReceta = "MEDICAMENTO" | "ORDEN_TERAPIA";
export type TipoEscala =
  | "BARTHEL"
  | "OSWESTRY"
  | "GONIOMETRICA"
  | "EVA"
  | "FUERZA_MUSCULAR"
  | "PERSONALIZADA";

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
}

export interface Aseguradora {
  id: string;
  nombre: string;
  tipoConvenio?: string | null;
  condiciones?: string | null;
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  porcentajeCobertura?: number | null;
  requiereAutorizacion: boolean;
  topeMontoPorSesion?: string | null;
  activo: boolean;
}

export interface PacienteAseguradora {
  id: string;
  pacienteId: string;
  aseguradoraId: string;
  numeroAfiliacion?: string | null;
  esPrimaria: boolean;
  aseguradora?: Aseguradora;
}

export type EstadoAutorizacion = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export interface AutorizacionSeguro {
  id: string;
  pacienteId: string;
  aseguradoraId: string;
  numeroAutorizacion?: string | null;
  sesionesAutorizadas?: number | null;
  estado: EstadoAutorizacion;
  fechaSolicitud: string;
  vigenciaHasta?: string | null;
  notas?: string | null;
  aseguradora?: Aseguradora;
}

export interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  fechaNacimiento: string;
  sexo: SexoPaciente;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  aseguradoras?: PacienteAseguradora[];
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string | null;
  activo: boolean;
  createdAt: string;
}

export interface EvaluacionFisiatrica {
  id: string;
  historiaClinicaId: string;
  fecha: string;
  tipoEscala: TipoEscala;
  nombreEscala?: string | null;
  datos: Record<string, unknown>;
  puntajeTotal?: number | null;
  observaciones?: string | null;
  evaluador?: { nombre: string; apellido: string };
}

export interface Sesion {
  id: string;
  historiaClinicaId: string;
  citaId?: string | null;
  fecha: string;
  notaEvolucion: string;
  tratamientoAplicado?: string | null;
  asistencia: "ASISTIO" | "INASISTIO" | "CANCELO";
  terapeuta?: { nombre: string; apellido: string };
}

export interface Adjunto {
  id: string;
  tipo: "IMAGEN" | "PDF" | "INFORME" | "OTRO";
  categoria?: string | null;
  nombreArchivo: string;
  rutaArchivo: string;
  descripcion?: string | null;
  createdAt: string;
}

export interface HistoriaClinica {
  id: string;
  pacienteId: string;
  motivoConsulta?: string | null;
  diagnosticoPrincipal?: string | null;
  codigoCIE10?: string | null;
  antecedentesMedicos?: string | null;
  antecedentesQuirurgicos?: string | null;
  antecedentesFamiliares?: string | null;
  alergias?: string | null;
  evaluaciones: EvaluacionFisiatrica[];
  sesiones: Sesion[];
  adjuntos: Adjunto[];
}

export interface Tarifa {
  id: string;
  nombreServicio: string;
  descripcion?: string | null;
  precio: string;
  aseguradoraId?: string | null;
  activo: boolean;
}

export interface Cita {
  id: string;
  pacienteId: string;
  profesionalId: string;
  tarifaId?: string | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: EstadoCita;
  esRecurrente: boolean;
  grupoRecurrenciaId?: string | null;
  numeroSesionEnGrupo?: number | null;
  totalSesionesGrupo?: number | null;
  notas?: string | null;
  paciente?: { id: string; nombres: string; apellidos: string; telefono: string };
  profesional?: { id: string; nombre: string; apellido: string };
  tarifa?: Tarifa | null;
}

export interface BloqueoHorario {
  id: string;
  profesionalId: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  motivo?: string | null;
}

export interface FacturaDetalle {
  id: string;
  tarifaId: string;
  tarifa?: Tarifa;
  descripcion?: string | null;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
}

export interface Factura {
  id: string;
  numeroFactura: string;
  pacienteId: string;
  paciente?: { nombres: string; apellidos: string; documento: string };
  aseguradoraId?: string | null;
  aseguradora?: Aseguradora | null;
  fecha: string;
  subtotal: string;
  impuestos: string;
  total: string;
  estado: EstadoFactura;
  notas?: string | null;
  detalles?: FacturaDetalle[];
  pagos?: Pago[];
  montoAseguradora?: string | null;
  montoPaciente?: string;
}

export interface Pago {
  id: string;
  facturaId: string;
  monto: string;
  metodoPago: MetodoPago;
  fecha: string;
  referencia?: string | null;
}

export interface ItemReceta {
  id: string;
  orden: number;
  medicamento?: string | null;
  presentacion?: string | null;
  dosis?: string | null;
  frecuencia?: string | null;
  duracion?: string | null;
  tipoTerapia?: string | null;
  sesiones?: number | null;
  observaciones?: string | null;
}

export interface Receta {
  id: string;
  numeroReceta: string;
  pacienteId: string;
  tipo: TipoReceta;
  diagnostico?: string | null;
  indicacionesGenerales?: string | null;
  fechaVencimiento?: string | null;
  codigoVerificacion: string;
  fecha: string;
  items: ItemReceta[];
  medico?: { nombre: string; apellido: string };
}

export interface PlantillaReceta {
  id: string;
  tipo: TipoReceta;
  medicamento?: string | null;
  presentacion?: string | null;
  dosis?: string | null;
  frecuencia?: string | null;
  duracion?: string | null;
  tipoTerapia?: string | null;
  sesiones?: number | null;
  observaciones?: string | null;
}

export interface PlantillaEjercicio {
  id: string;
  nombre: string;
  categoria?: string | null;
  descripcion?: string | null;
  repeticionesSugeridas?: string | null;
}

export interface ItemPlanEjercicio {
  id: string;
  orden: number;
  nombre: string;
  descripcion?: string | null;
  repeticionesSugeridas?: string | null;
}

export interface PlanEjercicios {
  id: string;
  pacienteId: string;
  fecha: string;
  notas?: string | null;
  items: ItemPlanEjercicio[];
}

export interface ConstanciaMedica {
  id: string;
  numeroConstancia: string;
  pacienteId: string;
  diagnostico?: string | null;
  codigoCIE10?: string | null;
  diasReposo?: number | null;
  fechaInicioReposo?: string | null;
  fechaFinReposo?: string | null;
  motivo: string;
  codigoVerificacion: string;
  fecha: string;
  medico?: { nombre: string; apellido: string };
}

export interface PerfilMedico {
  id: string;
  usuarioId: string;
  colegiatura?: string | null;
  cma?: string | null;
  rif?: string | null;
  instagram?: string | null;
  tituloProfesional?: string | null;
  nombreConsultorio: string;
  direccionConsultorio?: string | null;
  telefonoConsultorio?: string | null;
  firmaUrl?: string | null;
}
