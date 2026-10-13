// Se muestra mientras se descarga el código de una pantalla que aún no se
// había abierto (las pantallas se cargan por separado de la portada).
export function CargandoPagina() {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      Cargando…
    </div>
  );
}
