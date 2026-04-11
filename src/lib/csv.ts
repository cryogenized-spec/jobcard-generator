export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';

  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const escapeCell = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const escaped = text.replaceAll('"', '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))
  ];
  return lines.join('\n');
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells.map((cell) => cell.trim());
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});
  });
}
