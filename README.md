# LilyMedical

Sistema de gestión para consultorios de fisiatría (medicina física y rehabilitación): control clínico de pacientes + administración del consultorio.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS v4 + React Router
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** PostgreSQL + Prisma ORM
- **Auth:** JWT con roles (`MEDICO`, `ADMINISTRATIVO`, `PACIENTE`)

## Estructura

```
lilymedical/
├── apps/
│   ├── backend/     API REST (Express + Prisma)
│   └── frontend/    SPA (React + Vite + Tailwind)
├── docker-compose.yml   PostgreSQL para desarrollo local
└── package.json         workspaces npm (raíz)
```

## Puesta en marcha (primera vez)

1. **Base de datos** — levantar Postgres. Dos opciones equivalentes (mismo usuario/contraseña/puerto, así que puedes cambiar de una a otra sin tocar `.env`):

   **Opción A — Docker (recomendada si la tienes disponible):**
   ```bash
   docker compose up -d
   ```

   **Opción B — Sin Docker**, usando un binario de Postgres embebido que corre en espacio de usuario (sin root), útil en entornos como este sandbox donde Docker no está instalado:
   ```bash
   npm install -D embedded-postgres --workspace=apps/backend
   node apps/backend/scripts/local-postgres.mjs
   ```
   Este comando deja el proceso corriendo en primer plano (o ejecútalo con `&`/`nohup` en segundo plano). Inicializa el cluster en `apps/backend/.pgdata/` la primera vez y crea la base `lilymedical` automáticamente.

2. **Variables de entorno del backend:**

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

   Edita `apps/backend/.env` y genera valores propios para `JWT_SECRET` y
   `FIELD_ENCRYPTION_KEY` (usados para firmar tokens y cifrar campos clínicos
   sensibles en reposo):

   ```bash
   openssl rand -hex 32   # para JWT_SECRET
   openssl rand -hex 32   # para FIELD_ENCRYPTION_KEY
   ```

3. **Instalar dependencias** (desde la raíz, instala backend y frontend vía workspaces):

   ```bash
   npm install
   ```

4. **Migraciones y datos iniciales:**

   ```bash
   npm run prisma:migrate --workspace=apps/backend
   npm run prisma:seed --workspace=apps/backend
   ```

   Esto crea dos usuarios de prueba:
   - `liliafiguera@gmail.com` / `Lily2024!` (rol MEDICO — Dra. Lilia Figuera, acceso clínico completo; el membrete/firma se configuran en "Mi perfil")
   - `admin@lilymedical.com` / `Lily2024!` (rol ADMINISTRATIVO — sin acceso a historias clínicas)

5. **Levantar el backend y el frontend** (en dos terminales):

   ```bash
   npm run dev:backend    # http://localhost:4000
   npm run dev:frontend   # http://localhost:5173
   ```

   El frontend tiene proxy configurado hacia `/api` y `/uploads`, así que basta con abrir `http://localhost:5173`.

## Estado de las fases de entrega

- [x] **Fase 1** — Schema de base de datos (Prisma): `Usuario`, `Paciente`, `HistoriaClinica`, `EvaluacionFisiatrica`, `Sesion`, `Adjunto`, `Cita`, `BloqueoHorario`, `Tarifa`, `Factura`, `FacturaDetalle`, `Pago`, `Aseguradora`, `Insumo`, `LogAcceso`.
- [x] **Fase 2** — Backend con endpoints CRUD para cada entidad, autenticación JWT, permisos por rol, cifrado de campos clínicos sensibles, log de auditoría de accesos a historias clínicas.
- [x] **Fase 3** — Frontend: identidad LilyMedical, login, Dashboard, módulo de Pacientes (búsqueda, alta, ficha con historia clínica/línea de tiempo/estado de cuenta) y módulo de Agenda (vistas día/semana/mes, citas simples y paquetes de sesiones recurrentes, bloqueos de horario).
- [x] **Fase 4** — Facturación: tarifas, generación de facturas, registro de pagos, estados de cuenta.
- [x] **Fase 5** — Dashboard con métricas clave y reportes (ingresos, pacientes nuevos, servicios más solicitados) exportables a CSV.
- [x] **Fase 6** — Recetario y documentos clínicos imprimibles: recetas/órdenes de terapia y constancias médicas en PDF tamaño media carta (igual al recetario físico del consultorio), con membrete, firma digital y QR de verificación pública; exportación de la historia clínica completa a PDF.
- [x] **Fase 7** — Carga de imágenes y estudios clínicos: pestaña "Imágenes y estudios" en la ficha del paciente para subir/ver/descargar/eliminar radiografías, resonancias, fotos clínicas e informes (categorizados), con galería y visor ampliado; diagrama corporal de dolor (frontal/dorsal) interactivo al registrar una evaluación fisiátrica.
- [x] **Fase 8** — Aseguradoras y convenios avanzados: cada aseguradora define % de cobertura, si requiere autorización previa y tope por sesión; cada paciente puede tener seguro primario y secundario (con su propio N° de afiliación) desde la pestaña "Seguros"; seguimiento de autorizaciones previas (pendiente/aprobada/rechazada); split automático paciente/aseguradora en facturación; reporte de cobros a aseguradora (CSV) para el reclamo al convenio; convenios reales precargados (PDVSA-HCM, Sicoprosa, Mercantil Seguros, La Previsora, MAPFRE), editables desde Facturación → Aseguradoras.

- [x] **Fase 9** — Recetario y planes de tratamiento avanzados: campo de alergias en la historia clínica (con alerta visible en la ficha y en el PDF de receta); favoritos de medicamentos/terapias por médico para autocompletar recetas; catálogo de ejercicios y planes de ejercicios imprimibles (hoja de indicaciones para terapia en casa); vigencia opcional en recetas para tratamientos crónicos repetibles.

- [x] **Fase 10** — Impresión e historial clínico enriquecido: exportación de la historia clínica en PDF filtrable por rango de fechas (opciones al exportar desde "Documentos"), anexo opcional de las imágenes/estudios cargados al final del documento, y gráfico de evolución en el tiempo (EVA, Barthel, goniometría/ROM u otra escala personalizada) para cada escala con al menos dos mediciones numéricas registradas.

### Pendiente / próximos pasos sugeridos

- **Fase 11** — Recordatorios de citas por email (hoy solo existe el campo `recordatorioEnviado` en `Cita`, listo para conectar un proveedor).
- **Fase 12** — Portal del paciente (rol `PACIENTE` ya existe en el modelo, falta el flujo de alta y las vistas).
- **Fase 13** — Tests automatizados, CI, backups programados y protección contra fuerza bruta en login.

Ver detalle completo en el plan de mejora acordado con el equipo (fases 7-13).

## Identidad visual

- El logo (`apps/backend/assets/logo-icon.png` y `apps/frontend/public/logo-icon.png`) es el isotipo real del consultorio de la Dra. Lilia Figuera, usado tanto en la interfaz (navbar, login, favicon) como en el membrete de los PDFs. Si el sistema se reutiliza para otro consultorio, basta con reemplazar ambos archivos.
- Los datos de membrete (MPPS, CMA, RIF, Instagram, dirección, teléfono) se editan desde **Mi perfil** dentro de la app; no están hardcodeados en el código, solo precargados en `prisma/seed.ts`.
- Paleta (verde salvia + rosa) y tipografía (Quicksand para el nombre/títulos, Nunito para texto de cuerpo) están tomadas del membrete físico real y se aplican tanto en la interfaz (`apps/frontend/src/index.css`) como en los PDFs (`apps/backend/src/lib/pdf.ts`, fuentes vía `@fontsource/*` e íconos vía `@fortawesome/fontawesome-free`).
- El QR de recetas/constancias enlaza al Instagram del consultorio (`membrete.instagram`, igual que el recetario físico); si un médico no carga su Instagram, cae de vuelta al QR de verificación del documento.

## Notas de seguridad y privacidad

- Las contraseñas se almacenan con `bcrypt`.
- Los campos clínicos sensibles (motivo de consulta, diagnóstico, antecedentes, notas de evolución) se cifran en reposo con AES-256-GCM antes de guardarse en la base de datos.
- Cada lectura/escritura de una historia clínica queda registrada en `LogAcceso` (usuario, acción, fecha, IP).
- El personal `ADMINISTRATIVO` no tiene acceso a los endpoints de `/historias-clinicas`, `/sesiones` ni `/adjuntos` — el middleware `roleGuard` lo bloquea en el backend, no solo se oculta en el frontend.
# lilymedical
