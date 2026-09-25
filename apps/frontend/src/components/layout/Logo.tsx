import { Link } from "react-router-dom";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return <img src="/logo-icon.png" alt="" className={`${className} object-contain`} aria-hidden="true" />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight text-lily-blue-800">
        Lily<span className="text-lily-pink-600">Medical</span>
      </span>
    </div>
  );
}

/** Logo que lleva a la página de inicio pública (la landing). */
export function LogoInicio({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="LilyMedical: ir a la página de inicio" className="rounded-lg">
      <Logo className={className} />
    </Link>
  );
}

/** Enlace de texto de vuelta a la landing, para las pantallas sueltas (login, registro...). */
export function VolverAlInicio() {
  return (
    <Link to="/" className="text-sm text-slate-500 hover:text-lily-blue-700 hover:underline">
      ← Volver a la página de inicio
    </Link>
  );
}

/** Enlace del encabezado del panel y del portal hacia la web pública. */
export function EnlaceSitioWeb() {
  return (
    <Link
      to="/"
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-lily-blue-700"
      title="Ir a la página de inicio del sitio"
    >
      <span aria-hidden="true">🌐</span>
      <span className="hidden sm:inline">Sitio web</span>
      <span className="sr-only sm:hidden">Sitio web</span>
    </Link>
  );
}
