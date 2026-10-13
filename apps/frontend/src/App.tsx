import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { CargandoPagina } from "./components/CargandoPagina";
import { LandingPage } from "./modules/landing/LandingPage";

// Solo la portada va en el paquete inicial: es lo que abren los pacientes
// nuevos y lo que mide Google. El sistema del consultorio y el portal se
// descargan aparte, cuando alguien entra a ellos.
const perezosa = <T,>(cargar: () => Promise<T>, nombre: keyof T) =>
  lazy(async () => ({ default: (await cargar())[nombre] as React.ComponentType }));

const AppLayout = perezosa(() => import("./components/layout/AppLayout"), "AppLayout");
const LoginPage = perezosa(() => import("./modules/auth/LoginPage"), "LoginPage");
const OlvidePasswordPage = perezosa(() => import("./modules/auth/OlvidePasswordPage"), "OlvidePasswordPage");
const RestablecerPasswordPage = perezosa(() => import("./modules/auth/RestablecerPasswordPage"), "RestablecerPasswordPage");
const DashboardPage = perezosa(() => import("./modules/dashboard/DashboardPage"), "DashboardPage");
const ReportesPage = perezosa(() => import("./modules/dashboard/ReportesPage"), "ReportesPage");
const PacientesListPage = perezosa(() => import("./modules/pacientes/PacientesListPage"), "PacientesListPage");
const PacienteDetailPage = perezosa(() => import("./modules/pacientes/PacienteDetailPage"), "PacienteDetailPage");
const AgendaPage = perezosa(() => import("./modules/agenda/AgendaPage"), "AgendaPage");
const FacturacionPage = perezosa(() => import("./modules/facturacion/FacturacionPage"), "FacturacionPage");
const PerfilMedicoPage = perezosa(() => import("./modules/perfil-medico/PerfilMedicoPage"), "PerfilMedicoPage");
const InventarioPage = perezosa(() => import("./modules/inventario/InventarioPage"), "InventarioPage");
const ServiciosPage = perezosa(() => import("./modules/servicios/ServiciosPage"), "ServiciosPage");
const GaleriaPage = perezosa(() => import("./modules/galeria/GaleriaPage"), "GaleriaPage");
const AvisoPortadaPage = perezosa(() => import("./modules/aviso-portada/AvisoPortadaPage"), "AvisoPortadaPage");
const PersonalPage = perezosa(() => import("./modules/personal/PersonalPage"), "PersonalPage");
const VerificacionPage = perezosa(() => import("./modules/verificacion/VerificacionPage"), "VerificacionPage");
const RegistroPacientePage = perezosa(() => import("./modules/portal-paciente/RegistroPacientePage"), "RegistroPacientePage");
const PortalLayout = perezosa(() => import("./modules/portal-paciente/PortalLayout"), "PortalLayout");
const PortalInicioPage = perezosa(() => import("./modules/portal-paciente/PortalInicioPage"), "PortalInicioPage");
const PortalCitasPage = perezosa(() => import("./modules/portal-paciente/PortalCitasPage"), "PortalCitasPage");
const PortalDocumentosPage = perezosa(() => import("./modules/portal-paciente/PortalDocumentosPage"), "PortalDocumentosPage");
const PortalPerfilPage = perezosa(() => import("./modules/portal-paciente/PortalPerfilPage"), "PortalPerfilPage");

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<CargandoPagina />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/olvide-password" element={<OlvidePasswordPage />} />
            <Route path="/restablecer-password" element={<RestablecerPasswordPage />} />
            <Route path="/registro-paciente" element={<RegistroPacientePage />} />
            <Route path="/verificar/:codigo" element={<VerificacionPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<ProtectedRoute allowedRoles={["PACIENTE"]} />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<PortalInicioPage />} />
                  <Route path="/portal/citas" element={<PortalCitasPage />} />
                  <Route path="/portal/documentos" element={<PortalDocumentosPage />} />
                  <Route path="/portal/perfil" element={<PortalPerfilPage />} />
                </Route>
              </Route>

              <Route
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "MEDICO", "ADMINISTRATIVO", "FISIATRA_AYUDANTE"]} />
                }
              >
                <Route element={<AppLayout />}>
                  {/* Todo el personal: seguimiento de pacientes y cuenta propia. */}
                  <Route path="/pacientes" element={<PacientesListPage />} />
                  <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
                  <Route path="/agenda" element={<AgendaPage />} />
                  <Route path="/perfil" element={<PerfilMedicoPage />} />

                  {/* Gestión del consultorio: fuera del alcance del ayudante. */}
                  <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MEDICO", "ADMINISTRATIVO"]} />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/facturacion" element={<FacturacionPage />} />
                    <Route path="/servicios" element={<ServiciosPage />} />
                    <Route path="/reportes" element={<ReportesPage />} />
                    <Route path="/inventario" element={<InventarioPage />} />
                    <Route path="/galeria" element={<GaleriaPage />} />
                    <Route path="/aviso-portada" element={<AvisoPortadaPage />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MEDICO"]} />}>
                    <Route path="/personal" element={<PersonalPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
