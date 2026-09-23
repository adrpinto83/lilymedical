# Fotos de la galería de la landing

Todo archivo de imagen guardado en esta carpeta aparece en el carrusel de la
landing **sin tocar una línea de código**: Vite los descubre al compilar
(`src/modules/landing/fotos.ts`), les pone hash y los optimiza.

Las cinco fotos que hay ahora son **provisionales**, de licencia libre; su
procedencia está en `CREDITOS.md`.

## Cómo poner las fotos del consultorio

1. Descárgalas de la cuenta `@dra.fisya` con la sesión iniciada, o pide la
   exportación a Meta en *Configuración → Tu información y permisos → Descargar
   tu información*. Instagram no entrega las imágenes de las publicaciones a
   quien no ha iniciado sesión, por eso no se pueden bajar automáticamente.
2. Borra las provisionales y `CREDITOS.md`, y guarda las nuevas aquí en `.jpg`,
   `.jpeg`, `.png`, `.webp` o `.avif`.
3. Pon `galeriaIlustrativa: false` en `src/modules/landing/contenido.ts` para
   quitar el aviso de "imágenes ilustrativas" que aparece bajo el carrusel.

## Nombres y pies de foto

El nombre del archivo define **el orden y el pie de foto**:

```
01-sesion-de-terapia-de-hombro.jpg   → 1.ª diapositiva, pie "Sesión de terapia de hombro"
```

El número inicial ordena y no se muestra; los guiones pasan a ser espacios.
Como en un nombre de archivo conviene evitar tildes y eñes, el pie definitivo
se escribe en `piesDeFoto` (en `contenido.ts`), usando como clave el nombre del
archivo sin extensión. Ese texto es también el que lee un lector de pantalla,
así que describe la foto de verdad.

## Recomendaciones

- Horizontales, 4:3 (p. ej. 1400 × 1050 px). Otras proporciones se recortan
  centradas.
- Entre 3 y 8 fotos. Con menos de 2 el carrusel oculta las flechas.
- Publica fotos de pacientes solo con su autorización por escrito.
