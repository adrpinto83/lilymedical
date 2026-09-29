// Exportador CSV pensado para abrirse con doble clic en Excel configurado en
// español (Venezuela): separador ";", coma decimal (ver `numeroCsv`) y BOM
// UTF-8 para que los acentos y la "ñ" se vean bien.
export function toCsv(rows: Record<string, unknown>[], columnas?: string[]): string {
  const headers = columnas ?? (rows[0] ? Object.keys(rows[0]) : []);
  if (headers.length === 0) return "﻿";
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[";\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map(escape).join(";"), ...rows.map((row) => headers.map((h) => escape(row[h])).join(";"))];
  return "﻿" + lines.join("\r\n");
}

/** 1234.5 → "1234,50" (Excel en español lo reconoce como número). */
export function numeroCsv(valor: { toString(): string } | number | null | undefined, decimales = 2): string {
  if (valor === null || valor === undefined) return "";
  return Number(valor.toString()).toFixed(decimales).replace(".", ",");
}

/** Fecha local dd/mm/aaaa. */
export function fechaCsv(fecha: Date): string {
  return `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}/${fecha.getFullYear()}`;
}
