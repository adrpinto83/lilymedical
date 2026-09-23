import { describe, it, expect, afterEach, vi } from "vitest";

// La galería consulta la API al montar; en los tests se usan siempre las fotos
// que trae el paquete.
vi.mock("../../services/galeria", () => ({
  listarGaleriaPublica: () => Promise.resolve([]),
}));
import { render, screen, within, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "./LandingPage";
import { fotosGaleria } from "./fotos";
import {
  beneficiosPortal,
  contacto,
  galeriaIlustrativa,
  doctora,
  instagram,
  servicios,
  testimonios,
} from "./contenido";

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

// El proyecto no usa `globals: true` en vitest, así que el auto-cleanup de
// Testing Library no está activo y hay que desmontar entre casos.
afterEach(cleanup);

describe("LandingPage", () => {
  it("muestra las dos llamadas a la acción del hero apuntando al portal y al contacto", () => {
    renderLanding();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!;

    expect(within(hero).getByRole("link", { name: /acceso a pacientes/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(within(hero).getByRole("link", { name: /agendar consulta/i })).toHaveAttribute(
      "href",
      "#contacto"
    );
  });

  it("enlaza el registro de pacientes nuevos", () => {
    renderLanding();
    expect(screen.getAllByRole("link", { name: /crea tu portal aquí|crear mi cuenta/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /crear mi cuenta/i })).toHaveAttribute(
      "href",
      "/registro-paciente"
    );
  });

  it("renderiza todas las secciones requeridas", () => {
    const { container } = renderLanding();
    const ids = ["sobre-mi", "servicios", "galeria", "portal", "testimonios", "instagram", "contacto"];
    for (const id of ids) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("lista los servicios y los testimonios definidos en el contenido", () => {
    renderLanding();
    for (const servicio of servicios) {
      expect(screen.getByText(servicio.titulo)).toBeInTheDocument();
    }
    for (const testimonio of testimonios) {
      expect(screen.getByText(testimonio.autor)).toBeInTheDocument();
    }
  });

  it("ilustra cada servicio y cada beneficio del portal", () => {
    const { container } = renderLanding();

    for (const { imagen } of [...servicios, ...beneficiosPortal]) {
      const img = container.querySelector(`img[src="${imagen}"]`);
      expect(img).not.toBeNull();
      // Decorativas: el encabezado contiguo ya nombra la tarjeta.
      expect(img).toHaveAttribute("alt", "");
    }
  });

  it("muestra la galería con sus fotos y el aviso de imágenes ilustrativas", () => {
    renderLanding();
    const galeria = document.querySelector("#galeria") as HTMLElement;

    expect(galeria).not.toBeNull();
    for (const foto of fotosGaleria) {
      expect(within(galeria).getByAltText(foto.alt)).toBeInTheDocument();
    }
    expect(within(galeria).getByRole("group", { name: /galería de rehabilitación/i })).toBeInTheDocument();
    if (galeriaIlustrativa) {
      expect(within(galeria).getByText(/imágenes ilustrativas de licencia libre/i)).toBeInTheDocument();
    }
  });

  it("publica los datos de contacto reales del consultorio", () => {
    renderLanding();
    expect(screen.getAllByText(contacto.direccion).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: contacto.telefono })[0]).toHaveAttribute(
      "href",
      `tel:${contacto.telefonoInternacional}`
    );
    expect(screen.getAllByRole("link", { name: new RegExp(contacto.instagramUsuario) })[0]).toHaveAttribute(
      "href",
      contacto.instagramUrl
    );
  });

  it("usa el retrato de Instagram cuando la foto del hero todavía no existe", () => {
    renderLanding();
    const heroImg = screen.getByAltText(`${doctora.nombre}, ${doctora.titulo}`);
    expect(heroImg).toHaveAttribute("src", doctora.foto);

    fireEvent.error(heroImg);

    expect(screen.getByAltText(`${doctora.nombre}, ${doctora.titulo}`)).toHaveAttribute(
      "src",
      instagram.avatar
    );
  });

  it("muestra el perfil de Instagram con su retrato y enlace", () => {
    renderLanding();
    const seccion = document.querySelector("#instagram")!;

    expect(
      within(seccion as HTMLElement).getByAltText(
        `Foto de perfil de ${contacto.instagramUsuario} en Instagram`
      )
    ).toHaveAttribute("src", instagram.avatar);
    expect(within(seccion as HTMLElement).getByRole("link", { name: /ver perfil/i })).toHaveAttribute(
      "href",
      contacto.instagramUrl
    );
  });
});
