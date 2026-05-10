import { ensureHeaders, getRows, updateRow, appendRow } from "@/lib/google/sheets";

const CHATBOT_SETTINGS_SHEET = "ChatbotSettings";

export const CHATBOT_SETTINGS_HEADERS = [
  "key",
  "value",
  "updated_at",
  "updated_by",
];

export type ChatbotSettings = {
  line_enabled: boolean;
  check_in_enabled: boolean;
  check_out_enabled: boolean;
  summary_enabled: boolean;
  skip_non_workdays: boolean;
  check_in_time: string;
  check_out_time: string;
  summary_time: string;
};

type SettingKey = keyof ChatbotSettings;

const DEFAULT_SETTINGS: ChatbotSettings = {
  line_enabled: true,
  check_in_enabled: true,
  check_out_enabled: true,
  summary_enabled: true,
  skip_non_workdays: true,
  check_in_time: "09:00",
  check_out_time: "17:30",
  summary_time: "17:45",
};

const BOOLEAN_KEYS = new Set<SettingKey>([
  "line_enabled",
  "check_in_enabled",
  "check_out_enabled",
  "summary_enabled",
  "skip_non_workdays",
]);

const TIME_KEYS = new Set<SettingKey>([
  "check_in_time",
  "check_out_time",
  "summary_time",
]);

function parseBoolean(value: unknown, fallback: boolean) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on", "enabled"].includes(raw)) return true;
  if (["false", "0", "no", "off", "disabled"].includes(raw)) return false;
  return fallback;
}

function parseTime(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  return /^\d{2}:\d{2}$/.test(raw) ? raw : fallback;
}

function normalizeValue(key: SettingKey, value: unknown) {
  if (BOOLEAN_KEYS.has(key)) return parseBoolean(value, Boolean(DEFAULT_SETTINGS[key])) ? "true" : "false";
  if (TIME_KEYS.has(key)) return parseTime(value, String(DEFAULT_SETTINGS[key]));
  return String(value ?? DEFAULT_SETTINGS[key] ?? "").trim();
}

function parseSettings(rows: Array<Record<string, string>>) {
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const key = String(row.key || "").trim() as SettingKey;
    if (!(key in DEFAULT_SETTINGS)) continue;
    if (BOOLEAN_KEYS.has(key)) {
      settings[key] = parseBoolean(row.value, Boolean(DEFAULT_SETTINGS[key])) as never;
    } else if (TIME_KEYS.has(key)) {
      settings[key] = parseTime(row.value, String(DEFAULT_SETTINGS[key])) as never;
    }
  }
  return settings;
}

export async function ensureChatbotSettingsSheet() {
  return ensureHeaders(CHATBOT_SETTINGS_SHEET, CHATBOT_SETTINGS_HEADERS);
}

export async function getChatbotSettings() {
  await ensureChatbotSettingsSheet();
  const { rows } = await getRows(CHATBOT_SETTINGS_SHEET);
  return parseSettings(rows);
}

export async function updateChatbotSettings(input: Partial<Record<SettingKey, unknown>>, updatedBy = "") {
  const headers = await ensureChatbotSettingsSheet();
  const { rows } = await getRows(CHATBOT_SETTINGS_SHEET);
  const now = new Date().toISOString();

  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    if (!(key in input)) continue;
    const value = normalizeValue(key, input[key]);
    const existing = rows.find((row) => row.key === key);
    const record = { key, value, updated_at: now, updated_by: updatedBy };
    if (existing) {
      await updateRow(CHATBOT_SETTINGS_SHEET, headers, Number(existing._rowNumber), record);
    } else {
      await appendRow(CHATBOT_SETTINGS_SHEET, headers, record);
    }
  }

  return getChatbotSettings();
}

export function isChatbotActionEnabled(action: string, settings: ChatbotSettings) {
  if (action === "check-in-reminder") return settings.check_in_enabled;
  if (action === "check-out-reminder") return settings.check_out_enabled;
  if (action === "summary") return settings.summary_enabled;
  return true;
}
