/**
 * Utility for exporting data to CSV safely
 * - Prefixes cells starting with formula triggers (=, +, -, @, \t, \r) with an apostrophe
 * - Encodes with UTF-8 BOM (\uFEFF) for Excel compatibility
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Prevent CSV / Excel formula injection
  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  if (str.length > 0 && formulaChars.includes(str.charAt(0))) {
    str = `'${str}`;
  }

  // If the cell contains quotes, commas, or newlines, escape quotes and wrap in quotes
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map(row => row.map(sanitizeCsvCell).join(','));

  // UTF-8 BOM
  const bom = '\uFEFF';
  const csvContent = bom + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
