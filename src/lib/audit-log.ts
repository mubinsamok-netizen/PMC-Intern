import { randomUUID } from "crypto";
import { appendRow, ensureHeaders, getRows } from "@/lib/google/sheets";
import type { SessionUser } from "@/lib/auth/session";

const AUDIT_LOG_SHEET = "AuditLog";

export const AUDIT_LOG_HEADERS = [
  "id",
  "user_id",
  "user_name",
  "action",
  "target_type",
  "target_id",
  "details",
  "ip",
  "user_agent",
  "created_at",
];

export type AuditLogInput = {
  user?: Partial<SessionUser> | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: unknown;
  ip?: string;
  userAgent?: string;
};

function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function serializeDetails(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return text(value);
  try {
    return text(JSON.stringify(value));
  } catch {
    return text(value);
  }
}

function formatLog(row: Record<string, string>) {
  return {
    id: row.id,
    user_id: row.user_id,
    user_name: row.user_name,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    details: row.details,
    ip: row.ip,
    user_agent: row.user_agent,
    created_at: row.created_at,
  };
}

export async function ensureAuditLogSheet() {
  return ensureHeaders(AUDIT_LOG_SHEET, AUDIT_LOG_HEADERS);
}

export async function writeAuditLog(input: AuditLogInput) {
  const headers = await ensureAuditLogSheet();
  const record = {
    id: randomUUID(),
    user_id: text(input.user?.id, 120),
    user_name: text(input.user?.full_name || input.user?.email, 160),
    action: text(input.action, 80),
    target_type: text(input.targetType, 80),
    target_id: text(input.targetId, 160),
    details: serializeDetails(input.details),
    ip: text(input.ip, 120),
    user_agent: text(input.userAgent, 500),
    created_at: new Date().toISOString(),
  };
  await appendRow(AUDIT_LOG_SHEET, headers, record);
  return formatLog(record);
}

export function writeAuditLogSafe(input: AuditLogInput) {
  writeAuditLog(input).catch((error) => console.error("[audit]", error));
}

export async function listAuditLogs(filters: Record<string, string> = {}) {
  await ensureAuditLogSheet();
  const { rows } = await getRows(AUDIT_LOG_SHEET);
  const q = text(filters.q).toLowerCase();
  const limit = Math.min(200, Math.max(20, Number(filters.limit || 80)));
  let scoped = rows;

  if (filters.action) scoped = scoped.filter((row) => row.action === filters.action);
  if (filters.from) scoped = scoped.filter((row) => String(row.created_at || "") >= filters.from);
  if (filters.to) scoped = scoped.filter((row) => String(row.created_at || "").slice(0, 10) <= filters.to);
  if (q) {
    scoped = scoped.filter((row) => [
      row.user_name,
      row.action,
      row.target_type,
      row.target_id,
      row.details,
    ].some((value) => text(value).toLowerCase().includes(q)));
  }

  return scoped
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, limit)
    .map(formatLog);
}
