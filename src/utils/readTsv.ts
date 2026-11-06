export function readTsv(input: string): string[][] {
  const rows: string[][] = [[]];
  let field = '';
  let quoted = false;
  const text = input.replace(/\r\n?/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') {field += '"'; i++;}
    else if (char === '"' && (quoted || !field)) quoted = !quoted;
    else if (!quoted && (char === '\t' || char === '\n')) {
      rows[rows.length - 1].push(field);
      field = '';
      if (char === '\n') rows.push([]);
    } else field += char;
  }
  if (quoted) throw new Error('A pasted cell has an unclosed quotation mark.');
  rows[rows.length - 1].push(field);
  return rows.filter(row => row.some(value => value.trim()));
}
