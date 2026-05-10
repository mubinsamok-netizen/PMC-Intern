import { randomUUID } from "crypto";
import { appendRow, ensureHeaders, getRows, updateRow, type SheetRow } from "@/lib/google/sheets";

const USERS_SHEET = "Users";

export const USER_HEADERS = [
  "id",
  "intern_code",
  "student_id",
  "employee_code",
  "full_name",
  "email",
  "password",
  "role",
  "university",
  "faculty",
  "major",
  "department",
  "mentor_name",
  "position",
  "phone",
  "profile_image",
  "internship_start_date",
  "internship_end_date",
  "required_days",
  "required_hours",
  "status",
  "last_login_at",
  "created_at",
  "updated_at",
];

export type UserRecord = SheetRow;

function text(value: unknown) {
  return String(value ?? "").trim();
}

export function sanitizeUser(user: Record<string, unknown>) {
  const { password: _password, password_hash: _hash, salt: _salt, _rowNumber: _row, ...safe } = user;
  return safe;
}

export async function ensureUserSheet() {
  return ensureHeaders(USERS_SHEET, USER_HEADERS);
}

export async function listUsers(filters: { q?: string; role?: string; status?: string; department?: string } = {}) {
  await ensureUserSheet();
  const { rows } = await getRows(USERS_SHEET);
  const q = String(filters.q || "").trim().toLowerCase();

  return rows
    .filter((row) => row.status !== "deleted")
    .filter((row) => !filters.role || row.role === filters.role)
    .filter((row) => !filters.status || row.status === filters.status)
    .filter((row) => !filters.department || String(row.department || "").toLowerCase().includes(filters.department.toLowerCase()))
    .filter((row) => {
      if (!q) return true;
      return [row.full_name, row.email, row.employee_code, row.intern_code, row.department]
        .some((value) => String(value || "").toLowerCase().includes(q));
    })
    .map(sanitizeUser);
}

export async function findUserByEmail(email: string) {
  await ensureUserSheet();
  const { rows } = await getRows(USERS_SHEET);
  return rows.find((row) => row.email.toLowerCase() === email.toLowerCase() && row.status !== "deleted") || null;
}

export async function createUser(data: Record<string, unknown>) {
  const headers = await ensureUserSheet();
  const { rows } = await getRows(USERS_SHEET);
  const email = String(data.email || "").trim().toLowerCase();
  const fullName = String(data.full_name || "").trim();
  const password = String(data.password || "").trim();
  const employeeCode = String(data.employee_code || data.intern_code || "").trim();

  if (!email || !fullName || !password) throw new Error("กรุณากรอกชื่อ อีเมล และรหัสผ่าน");
  if (rows.some((row) => row.email.toLowerCase() === email)) throw new Error("อีเมลนี้มีอยู่แล้ว");
  if (employeeCode && rows.some((row) => row.employee_code === employeeCode || row.intern_code === employeeCode)) {
    throw new Error("รหัสนักศึกษา/พนักงานนี้มีอยู่แล้ว");
  }

  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    intern_code: employeeCode,
    student_id: String(data.student_id || employeeCode),
    employee_code: employeeCode,
    full_name: fullName,
    email,
    password,
    role: data.role === "admin" ? "admin" : "intern",
    university: text(data.university),
    faculty: text(data.faculty),
    major: text(data.major),
    department: text(data.department),
    mentor_name: text(data.mentor_name),
    position: text(data.position) || "Intern",
    phone: text(data.phone),
    profile_image: text(data.profile_image),
    internship_start_date: text(data.internship_start_date),
    internship_end_date: text(data.internship_end_date),
    required_days: text(data.required_days),
    required_hours: text(data.required_hours),
    status: text(data.status) || "active",
    last_login_at: "",
    created_at: now,
    updated_at: now,
  };

  await appendRow(USERS_SHEET, headers, record);
  return sanitizeUser({ ...record, _rowNumber: "" });
}

export async function ensureDefaultAdmin(adminPassword = "Admin@2026") {
  await ensureUserSheet();
  const { rows } = await getRows(USERS_SHEET);
  const hasAdmin = rows.some((row) => row.role === "admin" && row.status !== "deleted");
  if (hasAdmin) return { created: false };

  const email = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || "admin@pichayamongkolconstruction.com";
  const user = await createUser({
    employee_code: "ADMIN001",
    intern_code: "ADMIN001",
    full_name: "ผู้ดูแลระบบ",
    email,
    password: adminPassword,
    role: "admin",
    department: "IT",
    position: "System Administrator",
    status: "active",
  });

  return { created: true, user };
}

export async function updateUser(id: string, data: Record<string, unknown>) {
  const headers = await ensureUserSheet();
  const { rows } = await getRows(USERS_SHEET);
  const target = rows.find((row) => row.id === id);
  if (!target) throw new Error("ไม่พบบัญชีผู้ใช้");

  const email = data.email === undefined ? "" : text(data.email).toLowerCase();
  const employeeCode = data.employee_code === undefined && data.intern_code === undefined
    ? ""
    : text(data.employee_code || data.intern_code);
  if (email && rows.some((row) => row.id !== id && row.email.toLowerCase() === email)) {
    throw new Error("อีเมลนี้มีอยู่แล้ว");
  }
  if (employeeCode && rows.some((row) => row.id !== id && (row.employee_code === employeeCode || row.intern_code === employeeCode))) {
    throw new Error("รหัสนักศึกษา/พนักงานนี้มีอยู่แล้ว");
  }

  const allowed = [
    "intern_code",
    "student_id",
    "employee_code",
    "full_name",
    "email",
    "password",
    "role",
    "university",
    "faculty",
    "major",
    "department",
    "mentor_name",
    "position",
    "phone",
    "profile_image",
    "internship_start_date",
    "internship_end_date",
    "required_days",
    "required_hours",
    "status",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  allowed.forEach((key) => {
    if (data[key] !== undefined) updates[key] = text(data[key]);
  });
  if (updates.email) updates.email = String(updates.email).toLowerCase();
  if (updates.role && updates.role !== "admin") updates.role = "intern";

  await updateRow(USERS_SHEET, headers, Number(target._rowNumber), updates);
  return sanitizeUser({ ...target, ...updates });
}

export async function deleteUser(id: string) {
  return updateUser(id, { status: "deleted" });
}

export async function migratePlainPasswords(options: { adminPassword: string; internPassword: string }) {
  const admin = await ensureDefaultAdmin(options.adminPassword);
  const headers = await ensureUserSheet();
  const { rows } = await getRows(USERS_SHEET);
  let changed = 0;

  for (const row of rows) {
    if (row.status === "deleted") continue;
    if (row.password) continue;
    const password = row.role === "admin" ? options.adminPassword : options.internPassword;
    await updateRow(USERS_SHEET, headers, Number(row._rowNumber), {
      password,
      updated_at: new Date().toISOString(),
    });
    changed += 1;
  }

  return { changed, defaultAdminCreated: admin.created };
}
