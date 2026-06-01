// Minimal CSV parser. Handles quoted fields, escaped quotes, CRLF.
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); records.push(row); row = []; field = ""; i++; continue;
      }
      field += c; i++;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); records.push(row); }

  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    if (rec.every((v) => v === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (rec[idx] || "").trim(); });
    rows.push(obj);
  }
  return { headers, rows };
}
