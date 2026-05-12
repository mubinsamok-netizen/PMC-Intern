import { env } from "@/lib/env";
import { getSheetsClient } from "@/lib/google/client";

export type SheetRow = Record<string, string> & { _rowNumber: string };
type SpreadsheetInfo = { title: string; sheets: string[] };
type RowsResult = { headers: string[]; rows: SheetRow[] };

const SHEETS_CACHE_TTL_MS = Number(process.env.GOOGLE_SHEETS_CACHE_TTL_MS || 5 * 60 * 1000);
const SHEET_ROWS_CACHE_TTL_MS = Number(process.env.GOOGLE_SHEET_ROWS_CACHE_TTL_MS || 15 * 1000);
let spreadsheetInfoCache: { value: SpreadsheetInfo; expiresAt: number } | null = null;
const headersCache = new Map<string, string[]>();
const rowsCache = new Map<string, { value: RowsResult; expiresAt: number }>();
const pendingRowsReads = new Map<string, Promise<RowsResult>>();
const pendingHeaderEnsures = new Map<string, Promise<string[]>>();

function escapeSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function cloneSpreadsheetInfo(info: SpreadsheetInfo): SpreadsheetInfo {
  return { title: info.title, sheets: [...info.sheets] };
}

function cacheSpreadsheetInfo(info: SpreadsheetInfo) {
  spreadsheetInfoCache = {
    value: cloneSpreadsheetInfo(info),
    expiresAt: Date.now() + SHEETS_CACHE_TTL_MS,
  };
}

function cloneRowsResult(result: RowsResult): RowsResult {
  return {
    headers: [...result.headers],
    rows: result.rows.map((row) => ({ ...row })),
  };
}

function cacheRows(sheetName: string, result: RowsResult) {
  rowsCache.set(sheetName, {
    value: cloneRowsResult(result),
    expiresAt: Date.now() + SHEET_ROWS_CACHE_TTL_MS,
  });
}

function invalidateRows(sheetName: string) {
  rowsCache.delete(sheetName);
  pendingRowsReads.delete(sheetName);
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
  if (spreadsheetInfoCache && spreadsheetInfoCache.expiresAt > Date.now()) {
    return cloneSpreadsheetInfo(spreadsheetInfoCache.value);
  }

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: env.google.sheetId,
    fields: "properties.title,sheets.properties.title",
  });

  const info = {
    title: res.data.properties?.title || "",
    sheets: (res.data.sheets || []).map((s) => s.properties?.title || "").filter(Boolean),
  };
  cacheSpreadsheetInfo(info);
  return cloneSpreadsheetInfo(info);
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
  cacheSpreadsheetInfo({ ...info, sheets: [...info.sheets, sheetName] });
}

export async function getRows(sheetName: string): Promise<{ headers: string[]; rows: SheetRow[] }> {
  const cached = rowsCache.get(sheetName);
  if (cached && cached.expiresAt > Date.now()) return cloneRowsResult(cached.value);

  const pending = pendingRowsReads.get(sheetName);
  if (pending) return cloneRowsResult(await pending);

  const readPromise = getRowsUncached(sheetName).finally(() => {
    pendingRowsReads.delete(sheetName);
  });
  pendingRowsReads.set(sheetName, readPromise);
  return cloneRowsResult(await readPromise);
}

async function getRowsUncached(sheetName: string): Promise<RowsResult> {
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

  const result = { headers, rows };
  cacheRows(sheetName, result);
  return result;
}

export async function ensureHeaders(sheetName: string, requiredHeaders: string[]) {
  const cached = headersCache.get(sheetName);
  if (cached && requiredHeaders.every((header) => cached.includes(header))) {
    return [...cached];
  }

  const pendingKey = `${sheetName}:${requiredHeaders.join("\u0000")}`;
  const pending = pendingHeaderEnsures.get(pendingKey);
  if (pending) return [...await pending];

  const ensurePromise = ensureHeadersUncached(sheetName, requiredHeaders).finally(() => {
    pendingHeaderEnsures.delete(pendingKey);
  });
  pendingHeaderEnsures.set(pendingKey, ensurePromise);
  return [...await ensurePromise];
}

async function ensureHeadersUncached(sheetName: string, requiredHeaders: string[]) {
  await ensureSheetExists(sheetName);
  const { headers } = await getRows(sheetName);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length === 0) {
    headersCache.set(sheetName, headers);
    return headers;
  }

  const nextHeaders = [...headers, ...missing];
  const endColumn = columnToLetter(nextHeaders.length);
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.google.sheetId,
    range: `${escapeSheetName(sheetName)}!A1:${endColumn}1`,
    valueInputOption: "RAW",
    requestBody: { values: [nextHeaders] },
  });

  headersCache.set(sheetName, nextHeaders);
  invalidateRows(sheetName);
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
  invalidateRows(sheetName);
}

export async function updateRow(sheetName: string, headers: string[], rowNumber: number, data: Record<string, unknown>, existingRow?: SheetRow) {
  const sheets = getSheetsClient();
  const row = existingRow || (await getRows(sheetName)).rows.find((r) => Number(r._rowNumber) === rowNumber);
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
  invalidateRows(sheetName);
}
