import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./modules/auth/LoginPage";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { ReportesPage } from "./modules/dashboard/ReportesPage";
import { PacientesListPage } from "./modules/pacientes/PacientesListPage";
import { PacienteDetailPage } from "./modules/pacientes/PacienteDetailPage";
import { AgendaPage } from "./modules/agenda/AgendaPage";
import { FacturacionPage } from "./modules/facturacion/FacturacionPage";
import { PerfilMedicoPage } from "./modules/perfil-medico/PerfilMedicoPage";
import { VerificacionPage } from "./modules/verificacion/VerificacionPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verificar/:codigo" element={<VerificacionPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pacientes" element={<PacientesListPage />} />
              <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/facturacion" element={<FacturacionPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
              <Route element={<ProtectedRoute allowedRoles={["MEDICO"]} />}>
                <Route path="/perfil" element={<PerfilMedicoPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
