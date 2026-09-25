import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { LandingPage } from "./modules/landing/LandingPage";
import { LoginPage } from "./modules/auth/LoginPage";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { ReportesPage } from "./modules/dashboard/ReportesPage";
import { PacientesListPage } from "./modules/pacientes/PacientesListPage";
import { PacienteDetailPage } from "./modules/pacientes/PacienteDetailPage";
import { AgendaPage } from "./modules/agenda/AgendaPage";
import { FacturacionPage } from "./modules/facturacion/FacturacionPage";
import { PerfilMedicoPage } from "./modules/perfil-medico/PerfilMedicoPage";
import { InventarioPage } from "./modules/inventario/InventarioPage";
import { GaleriaPage } from "./modules/galeria/GaleriaPage";
import { AvisoPortadaPage } from "./modules/aviso-portada/AvisoPortadaPage";
import { PersonalPage } from "./modules/personal/PersonalPage";
import { VerificacionPage } from "./modules/verificacion/VerificacionPage";
import { RegistroPacientePage } from "./modules/portal-paciente/RegistroPacientePage";
import { PortalLayout } from "./modules/portal-paciente/PortalLayout";
import { PortalInicioPage } from "./modules/portal-paciente/PortalInicioPage";
import { PortalCitasPage } from "./modules/portal-paciente/PortalCitasPage";
import { PortalDocumentosPage } from "./modules/portal-paciente/PortalDocumentosPage";
import { PortalPerfilPage } from "./modules/portal-paciente/PortalPerfilPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
