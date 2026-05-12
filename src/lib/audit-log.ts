import { randomUUID } from "crypto";
import type { SessionUser } from "@/lib/auth/session";

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

function formatLog(input: AuditLogInput) {
  return {
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
}

export async function ensureAuditLogSheet() {
  return AUDIT_LOG_HEADERS;
}

export async function writeAuditLog(input: AuditLogInput) {
  return formatLog(input);
}

export function writeAuditLogSafe(_input: AuditLogInput) {
  return undefined;
}

export async function listAuditLogs(_filters: Record<string, string> = {}) {
  return [];
}
