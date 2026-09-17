import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { Logo } from "../../components/layout/Logo";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/portal", label: "Inicio", icon: "🏠", end: true },
  { to: "/portal/citas", label: "Mis citas", icon: "🗓️", end: false },
  { to: "/portal/documentos", label: "Mis documentos", icon: "📄", end: false },
  { to: "/portal/perfil", label: "Mi perfil", icon: "👤", end: false },
];

export function PortalLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-slate-600 sm:block">
                {user.nombre} {user.apellido}
              </span>
            )}
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-lily-blue-600 text-white"
                    : "text-slate-600 hover:bg-lily-blue-50 hover:text-lily-blue-700"
                )
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-slate-500 sm:px-6">
          LilyMedical · Portal del paciente · © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
