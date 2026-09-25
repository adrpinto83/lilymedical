import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo, LogoMark } from "../../components/layout/Logo";
import { Carrusel } from "./Carrusel";
import { AvisoPortada } from "./AvisoPortada";
import { useGaleria } from "./useGaleria";
import {
  beneficiosPortal,
  contacto,
  doctora,
  horarios,
  instagram,
  servicios,
  testimonios,
} from "./contenido";

const secciones = [
  { href: "#sobre-mi", label: "Sobre la doctora" },
  { href: "#servicios", label: "Servicios" },
  { href: "#galeria", label: "Galería" },
  { href: "#portal", label: "Portal del paciente" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#contacto", label: "Contacto" },
];

const whatsappUrl = `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(
  "Hola, quisiera agendar una consulta de fisiatría."
)}`;

/** Foto de la doctora con marcador de reemplazo si el archivo aún no se subió. */
function FotoDoctora() {
  const [sinFoto, setSinFoto] = useState(false);

  if (sinFoto) {
    // Respaldo mientras no haya foto en alta resolución: el retrato del perfil
    // de Instagram, mostrado en círculo pequeño para no ampliar sus 150 px.
    return (
      <div className="flex aspect-4/5 w-full flex-col items-center justify-center gap-4 rounded-3xl bg-lily-blue-50 p-8 text-center">
        <img
          src={instagram.avatar}
          alt={`${doctora.nombre}, ${doctora.titulo}`}
          width={150}
          height={150}
          className="h-36 w-36 rounded-full object-cover shadow-md ring-4 ring-white"
        />
        <div>
          <p className="font-display text-lg font-bold text-lily-blue-800">{doctora.nombre}</p>
          <p className="text-sm text-lily-blue-600">{doctora.titulo}</p>
        </div>
        <LogoMark className="h-8 w-8 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={doctora.foto}
      onError={() => setSinFoto(true)}
      alt={`${doctora.nombre}, ${doctora.titulo}`}
      className="aspect-4/5 w-full rounded-3xl object-cover shadow-lg"
    />
  );
}

function Seccion({
  id,
  titulo,
  antetitulo,
  descripcion,
  className,
  children,
}: {
  id: string;
  titulo: string;
  antetitulo?: string;
  descripcion?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={`scroll-mt-20 py-16 sm:py-20 ${className ?? ""}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          {antetitulo && (
            <p className="text-sm font-bold uppercase tracking-wider text-lily-pink-600">{antetitulo}</p>
          )}
          <h2
            id={`${id}-titulo`}
            className="mt-2 font-display text-3xl font-bold text-lily-blue-900 sm:text-4xl"
          >
            {titulo}
          </h2>
          {descripcion && <p className="mt-4 text-base leading-relaxed text-lily-blue-700">{descripcion}</p>}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const galeria = useGaleria();

  return (
    <div className="min-h-screen bg-white">
      <AvisoPortada />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-lily-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-lily-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <nav aria-label="Secciones" className="hidden items-center gap-1 lg:flex">
            {secciones.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-lily-blue-700 transition-colors hover:bg-lily-blue-50"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden rounded-lg bg-lily-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-lily-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-blue-600 sm:inline-flex"
            >
              Acceso a pacientes
            </Link>
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-label="Abrir menú de navegación"
              className="rounded-md p-2 text-lily-blue-700 hover:bg-lily-blue-50 lg:hidden"
            >
              ☰
            </button>
          </div>
        </div>

        {menuAbierto && (
          <nav aria-label="Secciones" className="border-t border-lily-blue-100 bg-white px-4 py-2 lg:hidden">
            {secciones.map((s) => (
              <a
                key={s.href}
                href={s.href}
                onClick={() => setMenuAbierto(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-lily-blue-700 hover:bg-lily-blue-50"
              >
                {s.label}
              </a>
            ))}
            <Link
              to="/login"
              className="mt-1 block rounded-lg bg-lily-blue-600 px-3 py-2 text-center text-sm font-semibold text-white sm:hidden"
            >
              Acceso a pacientes
            </Link>
          </nav>
        )}
      </header>

      <main id="contenido">
        {/* ---------------------------------------------------------------- Hero */}
        <section className="bg-gradient-to-br from-lily-blue-50 via-white to-lily-pink-50">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-lily-pink-700 shadow-sm">
                <span aria-hidden="true">🌿</span> {doctora.tagline}
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-lily-blue-900 sm:text-5xl">
                Recupera el movimiento, <span className="text-lily-pink-600">sin dolor</span> y a tu ritmo
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-lily-blue-700">
                Medicina física y rehabilitación con la {doctora.nombre}. Un diagnóstico claro, un plan de
                terapias hecho para tu caso y seguimiento de tu progreso consulta a consulta.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-lily-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-lily-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-blue-600"
                >
                  <span aria-hidden="true">🔐</span> Acceso a pacientes
                </Link>
                <a
                  href="#contacto"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-lily-blue-200 bg-white px-6 py-3.5 text-base font-semibold text-lily-blue-700 transition-colors hover:bg-lily-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-blue-600"
                >
                  <span aria-hidden="true">📅</span> Agendar consulta
                </a>
              </div>
              <p className="mt-3 text-sm text-lily-blue-600">
                Ver tu progreso y tus terapias · ¿Primera vez?{" "}
                <Link to="/registro-paciente" className="font-semibold text-lily-pink-700 hover:underline">
                  Crea tu portal aquí
                </Link>
              </p>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-lily-blue-100 pt-6">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-lily-blue-500">MPPS</dt>
                  <dd className="font-display text-lg font-bold text-lily-blue-800">{doctora.mpps}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-lily-blue-500">CMA</dt>
                  <dd className="font-display text-lg font-bold text-lily-blue-800">{doctora.cma}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-lily-blue-500">Consulta</dt>
                  <dd className="font-display text-lg font-bold text-lily-blue-800">Puerto La Cruz</dd>
                </div>
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-lily-pink-100/60" aria-hidden="true" />
              <FotoDoctora />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ Sobre la doctora */}
        <Seccion
          id="sobre-mi"
          antetitulo="Sobre la doctora"
          titulo={doctora.nombre}
          descripcion={`${doctora.titulo} · MPPS ${doctora.mpps} · CMA ${doctora.cma}`}
        >
          <img
            src={instagram.avatar}
            alt={`Retrato de ${doctora.nombre}`}
            width={150}
            height={150}
            className="mx-auto mb-8 h-28 w-28 rounded-full object-cover shadow-md ring-4 ring-lily-pink-100"
          />
          <div className="mx-auto max-w-3xl space-y-5 text-center text-base leading-relaxed text-lily-blue-700">
            <p>
              Soy médico fisiatra y atiendo en Puerto La Cruz a personas que conviven con dolor o con una
              limitación para moverse: una lesión deportiva, un dolor de columna que no cede, la recuperación
              después de una cirugía o de un accidente cerebrovascular.
            </p>
            <p>
              Mi trabajo empieza por entender de dónde viene el problema. De ahí sale un plan de rehabilitación
              pensado para tu caso y para tu vida real: lo que se hace en consulta, lo que se hace en casa y
              cómo vamos midiendo el avance en cada control.
            </p>
            <p className="font-semibold text-lily-blue-800">
              La rehabilitación funciona cuando el paciente entiende lo que está haciendo. Por eso explico
              cada indicación y te la entrego por escrito.
            </p>
          </div>
        </Seccion>

        {/* ------------------------------------------------------------- Servicios */}
        <Seccion
          id="servicios"
          antetitulo="Servicios"
          titulo="Tratamientos y áreas de atención"
          descripcion="Todo el proceso en un mismo lugar: evaluación, terapias y los documentos que necesitas para tu trabajo o tu seguro."
          className="bg-lily-blue-50"
        >
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {servicios.map((s) => (
              <li
                key={s.titulo}
                className="overflow-hidden rounded-2xl border border-lily-blue-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Ilustración decorativa: el título contiguo ya nombra el servicio. */}
                <img src={s.imagen} alt="" loading="lazy" className="aspect-4/3 w-full object-cover" />
                <div className="p-6">
                  <h3 className="font-display text-lg font-bold text-lily-blue-900">{s.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-lily-blue-700">{s.descripcion}</p>
                </div>
              </li>
            ))}
          </ul>
        </Seccion>

        {/* --------------------------------------------------------------- Galería */}
        {galeria.fotos.length > 0 && (
          <Seccion
            id="galeria"
            antetitulo="Galería"
            titulo="La rehabilitación, paso a paso"
            descripcion="Evaluación, terapia guiada y ejercicio pautado: así se ve el trabajo que hay detrás de recuperar el movimiento."
          >
            <Carrusel fotos={galeria.fotos} etiqueta="Galería de rehabilitación" />
            {galeria.ilustrativa && (
              <p className="mt-5 text-center text-xs text-lily-blue-500">
                Imágenes ilustrativas de licencia libre, no tomadas en el consultorio.
              </p>
            )}
          </Seccion>
        )}

        {/* ------------------------------------------------- Portal del paciente */}
        <Seccion
          id="portal"
          antetitulo="Portal del paciente"
          titulo="Tu tratamiento también vive en tu teléfono"
          descripcion="Con tu cédula y un correo creas tu cuenta en LilyMedical y entras a tu información clínica cuando la necesites."
        >
          <ul className="grid gap-6 sm:grid-cols-2">
            {beneficiosPortal.map((b) => (
              <li key={b.titulo} className="flex flex-col gap-4 rounded-2xl bg-lily-blue-50 p-6 sm:flex-row">
                <img
                  src={b.imagen}
                  alt=""
                  loading="lazy"
                  className="aspect-4/3 w-28 shrink-0 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-display text-lg font-bold text-lily-blue-900">{b.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-lily-blue-700">{b.descripcion}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-lily-pink-50 px-6 py-8 text-center sm:flex-row sm:text-left">
            <p className="text-base font-semibold text-lily-blue-800">
              ¿Ya eres paciente del consultorio? Tu portal está listo.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to="/registro-paciente"
                className="inline-flex items-center justify-center rounded-xl bg-lily-pink-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lily-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600"
              >
                Crear mi cuenta
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-lily-pink-200 bg-white px-5 py-3 text-sm font-semibold text-lily-pink-700 transition-colors hover:bg-white/70"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </Seccion>

        {/* ----------------------------------------------------------- Testimonios */}
        <Seccion
          id="testimonios"
          antetitulo="Testimonios"
          titulo="Lo que cuentan los pacientes"
          descripcion="Experiencias de personas que completaron su proceso de rehabilitación en el consultorio."
          className="bg-lily-blue-50"
        >
          <ul className="grid gap-6 lg:grid-cols-3">
            {testimonios.map((t) => (
              <li key={t.autor} className="flex flex-col rounded-2xl border border-lily-blue-100 bg-white p-6 shadow-sm">
                <span aria-hidden="true" className="font-display text-4xl leading-none text-lily-pink-300">
                  &ldquo;
                </span>
                <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-lily-blue-700">
                  {t.texto}
                </blockquote>
                <footer className="mt-4 border-t border-lily-blue-100 pt-4">
                  <p className="text-sm font-semibold text-lily-blue-900">{t.autor}</p>
                  <p className="text-xs text-lily-blue-500">{t.detalle}</p>
                </footer>
              </li>
            ))}
          </ul>
        </Seccion>

        {/* ------------------------------------------------------------- Instagram */}
        <Seccion
          id="instagram"
          antetitulo="En redes"
          titulo="Síguela en Instagram"
          descripcion={`${instagram.bio}. Consejos de rehabilitación, ejercicios y avisos del consultorio.`}
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-2xl bg-gradient-to-br from-lily-pink-50 to-lily-blue-50 p-8 text-center sm:flex-row sm:text-left">
            <img
              src={instagram.avatar}
              alt={`Foto de perfil de ${contacto.instagramUsuario} en Instagram`}
              width={150}
              height={150}
              className="h-24 w-24 shrink-0 rounded-full object-cover shadow-md ring-4 ring-white"
            />
            <div className="flex-1">
              <p className="font-display text-lg font-bold text-lily-blue-900">{contacto.instagramUsuario}</p>
              <p className="mt-1 text-sm text-lily-blue-700">
                {instagram.publicaciones} publicaciones · {instagram.seguidores} seguidores
              </p>
            </div>
            <a
              href={contacto.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-lily-pink-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lily-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600"
            >
              <span aria-hidden="true">📸</span> Ver perfil
            </a>
          </div>

        </Seccion>

        {/* -------------------------------------------------------------- Contacto */}
        <Seccion
          id="contacto"
          antetitulo="Contacto"
          titulo="Agenda tu consulta"
          descripcion="Escribe por WhatsApp o llama al consultorio y coordinamos tu cita."
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <ul className="space-y-4">
              <li className="flex gap-4 rounded-2xl border border-lily-blue-100 p-5">
                <span aria-hidden="true" className="text-2xl">📍</span>
                <div>
                  <h3 className="font-display text-base font-bold text-lily-blue-900">Consultorio</h3>
                  <p className="mt-1 text-sm text-lily-blue-700">{contacto.direccion}</p>
                  <a
                    href={contacto.mapaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-semibold text-lily-pink-700 hover:underline"
                  >
                    Ver en el mapa →
                  </a>
                </div>
              </li>
              <li className="flex gap-4 rounded-2xl border border-lily-blue-100 p-5">
                <span aria-hidden="true" className="text-2xl">📞</span>
                <div>
                  <h3 className="font-display text-base font-bold text-lily-blue-900">Teléfono y WhatsApp</h3>
                  <a
                    href={`tel:${contacto.telefonoInternacional}`}
                    className="mt-1 block text-sm text-lily-blue-700 hover:underline"
                  >
                    {contacto.telefono}
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-semibold text-lily-pink-700 hover:underline"
                  >
                    Escribir por WhatsApp →
                  </a>
                </div>
              </li>
              <li className="flex gap-4 rounded-2xl border border-lily-blue-100 p-5">
                <span aria-hidden="true" className="text-2xl">📸</span>
                <div>
                  <h3 className="font-display text-base font-bold text-lily-blue-900">Redes sociales</h3>
                  <a
                    href={contacto.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-lily-blue-700 hover:underline"
                  >
                    Instagram {contacto.instagramUsuario}
                  </a>
                </div>
              </li>
            </ul>

            <div className="rounded-2xl bg-lily-blue-50 p-6">
              <h3 className="font-display text-lg font-bold text-lily-blue-900">Horario de atención</h3>
              <dl className="mt-4 divide-y divide-lily-blue-200">
                {horarios.map((h) => (
                  <div key={h.dias} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm font-medium text-lily-blue-800">{h.dias}</dt>
                    <dd className="text-sm text-lily-blue-600">{h.horas}</dd>
                  </div>
                ))}
              </dl>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lily-blue-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-lily-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-blue-600"
              >
                <span aria-hidden="true">💬</span> Agendar por WhatsApp
              </a>
              <p className="mt-3 text-center text-xs text-lily-blue-600">
                Las urgencias no se atienden por esta vía; acude al centro de emergencia más cercano.
              </p>
            </div>
          </div>
        </Seccion>
      </main>

      <footer className="border-t border-lily-blue-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <Logo />
          <p className="text-sm text-lily-blue-700">
            {doctora.nombre} · {doctora.titulo} · MPPS {doctora.mpps}
          </p>
          <p className="text-sm text-lily-blue-600">{contacto.direccion}</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href={contacto.instagramUrl} target="_blank" rel="noreferrer" className="text-lily-pink-700 hover:underline">
              {contacto.instagramUsuario}
            </a>
            <a href={`tel:${contacto.telefonoInternacional}`} className="text-lily-pink-700 hover:underline">
              {contacto.telefono}
            </a>
            <Link to="/login" className="text-lily-pink-700 hover:underline">
              Acceso a pacientes
            </Link>
          </div>
          <p className="text-xs text-lily-blue-500">
            LilyMedical · © {new Date().getFullYear()} · La información de este sitio es orientativa y no
            sustituye la consulta médica.
          </p>
        </div>
      </footer>
    </div>
  );
}
