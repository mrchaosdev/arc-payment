/**
 * A cell that opens with one of these is read as a formula by spreadsheet
 * software. Memos and references are typed by whoever builds a request, so they
 * are prefixed with a quote rather than trusted.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number | undefined): string {
  let text = value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 rows joined with CRLF; the first row is the header. */
export function toCsv(rows: (string | number | undefined)[][]): string {
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // The BOM is what makes Excel read a non-ASCII memo as UTF-8.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
