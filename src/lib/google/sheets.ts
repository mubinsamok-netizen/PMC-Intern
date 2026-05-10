import { env } from "@/lib/env";
import { getSheetsClient } from "@/lib/google/client";

export type SheetRow = Record<string, string> & { _rowNumber: string };

function escapeSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

export function columnToLetter(index: number) {
  let result = "";
  let n = index;
  while (n > 0) {
    const mod = (n - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    n = Math.floor((n - mod) / 26);
  }
  return result;
}

export async function getSpreadsheetInfo() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: env.google.sheetId,
    fields: "properties.title,sheets.properties.title",
  });

  return {
    title: res.data.properties?.title || "",
    sheets: (res.data.sheets || []).map((s) => s.properties?.title || "").filter(Boolean),
  };
}

export async function ensureSheetExists(sheetName: string) {
  const info = await getSpreadsheetInfo();
  if (info.sheets.includes(sheetName)) return;

  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: env.google.sheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: sheetName },
          },
        },
      ],
    },
  });
}

export async function getRows(sheetName: string): Promise<{ headers: string[]; rows: SheetRow[] }> {
  const sheets = getSheetsClient();
  const range = `${escapeSheetName(sheetName)}!A:ZZ`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.google.sheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const values = (res.data.values || []) as unknown[][];
  const headers = (values[0] || []).map((h) => String(h || "").trim());
  const rows = values.slice(1).map((row, rowIndex) => {
    const record: SheetRow = { _rowNumber: String(rowIndex + 2) };
    headers.forEach((header, index) => {
      if (header) record[header] = String(row[index] ?? "");
    });
    return record;
  });

  return { headers, rows };
}

export async function ensureHeaders(sheetName: string, requiredHeaders: string[]) {
  await ensureSheetExists(sheetName);
  const { headers } = await getRows(sheetName);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length === 0) return headers;

  const nextHeaders = [...headers, ...missing];
  const endColumn = columnToLetter(nextHeaders.length);
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.google.sheetId,
    range: `${escapeSheetName(sheetName)}!A1:${endColumn}1`,
    valueInputOption: "RAW",
    requestBody: { values: [nextHeaders] },
  });

  return nextHeaders;
}

export async function appendRow(sheetName: string, headers: string[], data: Record<string, unknown>) {
  const sheets = getSheetsClient();
  const values = headers.map((header) => String(data[header] ?? ""));
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.google.sheetId,
    range: `${escapeSheetName(sheetName)}!A:ZZ`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

export async function updateRow(sheetName: string, headers: string[], rowNumber: number, data: Record<string, unknown>) {
  const sheets = getSheetsClient();
  const current = await getRows(sheetName);
  const row = current.rows.find((r) => Number(r._rowNumber) === rowNumber);
  if (!row) throw new Error(`Row ${rowNumber} not found in ${sheetName}`);

  const merged = { ...row, ...data };
  const values = headers.map((header) => String(merged[header] ?? ""));
  const endColumn = columnToLetter(headers.length);

  await sheets.spreadsheets.values.update({
    spreadsheetId: env.google.sheetId,
    range: `${escapeSheetName(sheetName)}!A${rowNumber}:${endColumn}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}
