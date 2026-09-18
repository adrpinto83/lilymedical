import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { Logo } from "./Logo";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: Array<"MEDICO" | "ADMINISTRATIVO">;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "📊", roles: ["MEDICO", "ADMINISTRATIVO"] },
  { to: "/pacientes", label: "Pacientes", icon: "🧑‍🤝‍🧑", roles: ["MEDICO", "ADMINISTRATIVO"] },
  { to: "/agenda", label: "Agenda", icon: "🗓️", roles: ["MEDICO", "ADMINISTRATIVO"] },
  { to: "/facturacion", label: "Facturación", icon: "🧾", roles: ["MEDICO", "ADMINISTRATIVO"] },
  { to: "/reportes", label: "Reportes", icon: "📈", roles: ["MEDICO", "ADMINISTRATIVO"] },
  { to: "/inventario", label: "Inventario", icon: "🛠️", roles: ["MEDICO", "ADMINISTRATIVO"] },
  { to: "/perfil", label: "Mi perfil", icon: "🩺", roles: ["MEDICO"] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !user || item.roles.includes(user.rol as "MEDICO" | "ADMINISTRATIVO")
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <Logo />
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-slate-600 sm:block">
                {user.nombre} {user.apellido}{" "}
                <span className="ml-1 rounded-full bg-lily-blue-50 px-2 py-0.5 text-xs font-medium text-lily-blue-700">
                  {user.rol === "MEDICO" ? "Médico" : "Administrativo"}
                </span>
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
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-30 w-64 -translate-x-full border-r border-slate-200 bg-white pt-20 transition-transform lg:static lg:translate-x-0 lg:border-0 lg:bg-transparent lg:pt-0",
            menuOpen && "translate-x-0"
          )}
        >
          <nav className="flex flex-col gap-1 px-4 lg:px-0">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
        </aside>

        {menuOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 sm:px-6">
          LilyMedical · Sistema de gestión para consultorios de fisiatría · © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
