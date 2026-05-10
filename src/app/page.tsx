"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  Camera,
  Clock3,
  Eye,
  FileSpreadsheet,
  Filter,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  LogIn,
  LogOut,
  LayoutDashboard,
  Menu,
  MapPin,
  Paperclip,
  Pencil,
  Search,
  Trash2,
  UserRound,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { RadiusMap } from "@/components/RadiusMap";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "intern";
  department?: string;
  employee_code?: string;
  intern_code?: string;
  profile_image?: string;
  student_id?: string;
  university?: string;
  faculty?: string;
  major?: string;
  mentor_name?: string;
  position?: string;
  phone?: string;
  internship_start_date?: string;
  internship_end_date?: string;
  required_days?: string;
  required_hours?: string;
  status?: string;
};

type Attendance = {
  id: string;
  user_id?: string;
  full_name: string;
  employee_code?: string;
  intern_code?: string;
  university?: string;
  department?: string;
  check_in_date: string;
  check_in_time: string;
  check_out_time?: string;
  work_mode?: string;
  location_lat?: string;
  location_lng?: string;
  location_address?: string;
  selfie_url?: string;
  checkin_selfie_url?: string;
  checkout_selfie_url?: string;
  status: string;
  total_hours?: number;
  total_hours_display?: string;
  is_late?: boolean;
  corrected_by?: string;
  correction_reason?: string;
  notes?: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read_at?: string | null;
  created_at: string;
};

type LeaveRequest = {
  id: string;
  user_id: string;
  intern_code?: string;
  employee_code?: string;
  full_name: string;
  department?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_mime_type?: string;
  status: "pending" | "approved" | "rejected" | string;
  admin_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
};

type AuditLog = {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  ip?: string;
  user_agent?: string;
  created_at: string;
};

type ViewKey = "dashboard" | "attendance" | "checkin" | "leave" | "users" | "reports" | "audit" | "account";
type ReportGroupBy = "user" | "department" | "university" | "work_mode" | "date";

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type CorrectionForm = {
  check_in_date: string;
  check_in_time: string;
  check_out_time: string;
  work_mode: string;
  location_lat: string;
  location_lng: string;
  location_address: string;
  notes: string;
  correction_reason: string;
};

type UserForm = {
  full_name: string;
  email: string;
  password: string;
  role: "admin" | "intern";
  employee_code: string;
  student_id: string;
  university: string;
  faculty: string;
  major: string;
  department: string;
  mentor_name: string;
  position: string;
  phone: string;
  internship_start_date: string;
  internship_end_date: string;
  required_days: string;
  required_hours: string;
  status: string;
};

type LeaveForm = {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  attachmentBase64: string;
  attachmentName: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileForm = {
  full_name: string;
  phone: string;
  profileImageBase64: string;
};

const workModes = [
  { value: "Office", label: "Office", hint: "สำนักงาน" },
  { value: "Site", label: "Site", hint: "ไซต์งาน" },
  { value: "WFH", label: "WFH", hint: "ที่พัก/ออนไลน์" },
  { value: "Field", label: "Field", hint: "นอกสถานที่" },
];

const emptyCorrectionForm: CorrectionForm = {
  check_in_date: "",
  check_in_time: "",
  check_out_time: "",
  work_mode: "Office",
  location_lat: "",
  location_lng: "",
  location_address: "",
  notes: "",
  correction_reason: "",
};

const emptyUserForm: UserForm = {
  full_name: "",
  email: "",
  password: "",
  role: "intern",
  employee_code: "",
  student_id: "",
  university: "",
  faculty: "",
  major: "",
  department: "",
  mentor_name: "",
  position: "Intern",
  phone: "",
  internship_start_date: "",
  internship_end_date: "",
  required_days: "",
  required_hours: "",
  status: "active",
};

const emptyLeaveForm: LeaveForm = {
  leave_type: "ลากิจ",
  start_date: "",
  end_date: "",
  reason: "",
  attachmentBase64: "",
  attachmentName: "",
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 0,
};

function mapUrl(row: Attendance) {
  if (!row.location_lat || !row.location_lng) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(`${row.location_lat},${row.location_lng}`)}`;
}

function statusText(row: Attendance) {
  if (row.status === "checked_out") return row.is_late ? "เช็คเอาท์แล้ว · ล่าช้า" : "เช็คเอาท์แล้ว";
  if (row.status === "checked_in") return row.is_late ? "เช็คอินแล้ว · ล่าช้า" : "เช็คอินแล้ว";
  return row.status || "-";
}

function statusChipClass(row: Attendance) {
  if (row.is_late) return "chip warning";
  if (row.status === "checked_out") return "chip success";
  return "chip";
}

function leaveStatusText(status: string) {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "rejected") return "ไม่อนุมัติ";
  return "รออนุมัติ";
}

function auditActionText(action: string) {
  const labels: Record<string, string> = {
    LOGIN: "เข้าสู่ระบบ",
    LOGOUT: "ออกจากระบบ",
    LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
    CHANGE_PASSWORD: "เปลี่ยนรหัสผ่าน",
    RESET_PASSWORD: "รีเซ็ตรหัสผ่าน",
    CREATE_USER: "เพิ่มบัญชี",
    UPDATE_USER: "แก้ไขบัญชี",
    DELETE_USER: "ลบบัญชี",
    CHECK_IN: "เช็คอิน",
    CHECK_OUT: "เช็คเอาท์",
    UPDATE_ATTENDANCE: "แก้ไขเวลา",
    DELETE_ATTENDANCE: "ลบเวลา",
    LEAVE_REQUEST: "ส่งคำขอลา",
    LEAVE_APPROVE: "อนุมัติลา",
    LEAVE_REJECT: "ไม่อนุมัติลา",
  };
  return labels[action] || action || "-";
}

function auditDetailsText(details?: string) {
  if (!details) return "-";
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join(" / ") || "-";
  } catch {
    return details;
  }
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function timeForInput(value?: string) {
  return value ? value.slice(0, 5) : "";
}

function attendanceCode(row: Attendance) {
  return row.employee_code || row.intern_code || "-";
}

function numericHours(row: Attendance) {
  return Number(row.total_hours || 0);
}

function formatHoursValue(value: number) {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${h} ชม. ${m} นาที`;
}

function formatThaiDate(value?: string) {
  const date = parseDateOnly(value || "");
  if (!date) return value || "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function bangkokDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseDateOnly(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countWeekdays(startValue?: string, endValue?: string) {
  const start = parseDateOnly(startValue);
  const end = parseDateOnly(endValue);
  if (!start || !end || end < start) return 0;
  let count = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function reportGroupKey(row: Attendance, groupBy: ReportGroupBy) {
  if (groupBy === "department") return row.department || "-";
  if (groupBy === "university") return row.university || "-";
  if (groupBy === "work_mode") return row.work_mode || "-";
  if (groupBy === "date") return row.check_in_date || "-";
  return `${attendanceCode(row)} / ${row.full_name || "-"}`;
}

function groupByLabel(groupBy: ReportGroupBy) {
  if (groupBy === "department") return "แผนก";
  if (groupBy === "university") return "มหาวิทยาลัย";
  if (groupBy === "work_mode") return "รูปแบบงาน";
  if (groupBy === "date") return "วันที่";
  return "นักศึกษา";
}

function profileInitials(name?: string) {
  return String(name || "?").trim().slice(0, 2).toUpperCase();
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [me, setMe] = useState<User | null>(null);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [accountAttendance, setAccountAttendance] = useState<Attendance[]>([]);
  const [accountLeaves, setAccountLeaves] = useState<LeaveRequest[]>([]);
  const [reportRows, setReportRows] = useState<Attendance[]>([]);
  const [dashboardUsers, setDashboardUsers] = useState<User[]>([]);
  const [dashboardRows, setDashboardRows] = useState<Attendance[]>([]);
  const [dashboardLeaves, setDashboardLeaves] = useState<LeaveRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [today, setToday] = useState<Attendance | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Attendance | null>(null);
  const [selectedCorrection, setSelectedCorrection] = useState<Attendance | null>(null);
  const [correctionForm, setCorrectionForm] = useState<CorrectionForm>(emptyCorrectionForm);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [attQ, setAttQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reportQ, setReportQ] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportGroupBy, setReportGroupBy] = useState<ReportGroupBy>("user");
  const [reportExporting, setReportExporting] = useState(false);
  const [reportSheetUrl, setReportSheetUrl] = useState("");
  const [leaveQ, setLeaveQ] = useState("");
  const [leaveStatus, setLeaveStatus] = useState("");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [auditQ, setAuditQ] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [leaveForm, setLeaveForm] = useState<LeaveForm>(emptyLeaveForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ full_name: "", phone: "", profileImageBase64: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [usersPagination, setUsersPagination] = useState<PaginationMeta>(emptyPagination);
  const [attendancePagination, setAttendancePagination] = useState<PaginationMeta>(emptyPagination);
  const [leavePagination, setLeavePagination] = useState<PaginationMeta>(emptyPagination);
  const [auditPagination, setAuditPagination] = useState<PaginationMeta>(emptyPagination);
  const [usersPage, setUsersPage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [workMode, setWorkMode] = useState("Office");
  const [locationAddress, setLocationAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [selfieBase64, setSelfieBase64] = useState("");
  const [checkoutSelfieBase64, setCheckoutSelfieBase64] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);

  const reportSummary = useMemo(() => {
    const internKeys = new Set(reportRows.map((row) => row.user_id || `${attendanceCode(row)}:${row.full_name}`));
    const totalHours = reportRows.reduce((sum, row) => sum + numericHours(row), 0);
    return {
      totalRows: reportRows.length,
      checkedOut: reportRows.filter((row) => row.status === "checked_out").length,
      late: reportRows.filter((row) => row.is_late).length,
      interns: internKeys.size,
      totalHours,
    };
  }, [reportRows]);

  const reportGroups = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      label: string;
      days: Set<string>;
      interns: Set<string>;
      rows: number;
      checkedOut: number;
      late: number;
      totalHours: number;
      firstDate: string;
      lastDate: string;
    }>();

    reportRows.forEach((row) => {
      const key = reportGroupKey(row, reportGroupBy);
      const current = groups.get(key) || {
        key,
        label: key,
        days: new Set<string>(),
        interns: new Set<string>(),
        rows: 0,
        checkedOut: 0,
        late: 0,
        totalHours: 0,
        firstDate: "",
        lastDate: "",
      };
      current.days.add(row.check_in_date);
      current.interns.add(row.user_id || attendanceCode(row));
      current.rows += 1;
      current.checkedOut += row.status === "checked_out" ? 1 : 0;
      current.late += row.is_late ? 1 : 0;
      current.totalHours += numericHours(row);
      current.firstDate = !current.firstDate || row.check_in_date < current.firstDate ? row.check_in_date : current.firstDate;
      current.lastDate = current.lastDate > row.check_in_date ? current.lastDate : row.check_in_date;
      groups.set(key, current);
    });

    return Array.from(groups.values())
      .map((group) => ({ ...group, dayCount: group.days.size, internCount: group.interns.size }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [reportGroupBy, reportRows]);

  const dashboardToday = useMemo(() => bangkokDateString(), []);

  const dashboardData = useMemo(() => {
    const interns = dashboardUsers.filter((user) => user.role === "intern" && (user.status || "active") === "active");
    const todayRows = dashboardRows.filter((row) => row.check_in_date === dashboardToday);
    const todayKeys = new Set(todayRows.map((row) => row.user_id || attendanceCode(row)));
    const absent = interns.filter((user) => !todayKeys.has(user.id) && !todayKeys.has(user.employee_code || user.intern_code || "-"));

    const hoursByUser = new Map<string, number>();
    const daysByUser = new Map<string, Set<string>>();
    dashboardRows.forEach((row) => {
      const key = row.user_id || attendanceCode(row);
      hoursByUser.set(key, (hoursByUser.get(key) || 0) + numericHours(row));
      const days = daysByUser.get(key) || new Set<string>();
      if (row.check_in_date) days.add(row.check_in_date);
      daysByUser.set(key, days);
    });

    const leaveDaysByUser = new Map<string, number>();
    dashboardLeaves
      .filter((row) => row.status === "approved")
      .forEach((row) => {
        leaveDaysByUser.set(row.user_id, (leaveDaysByUser.get(row.user_id) || 0) + Number(row.total_days || 0));
      });

    const progress = interns
      .map((user) => {
        const key = user.id;
        const fallbackKey = user.employee_code || user.intern_code || "-";
        const totalHours = hoursByUser.get(key) || hoursByUser.get(fallbackKey) || 0;
        const attendedDays = (daysByUser.get(key) || daysByUser.get(fallbackKey) || new Set<string>()).size;
        const approvedLeaveDays = leaveDaysByUser.get(key) || 0;
        const plannedDays = Number(user.required_days || 0) || countWeekdays(user.internship_start_date, user.internship_end_date);
        const elapsedDays = countWeekdays(user.internship_start_date, dashboardToday);
        const remainingDays = Math.max(0, countWeekdays(bangkokDateString(addDays(parseDateOnly(dashboardToday) || new Date(), 1)), user.internship_end_date));
        const absentDays = Math.max(0, elapsedDays - attendedDays - approvedLeaveDays);
        const requiredHours = Number(user.required_hours || 0);
        const percent = requiredHours > 0 ? Math.min(100, Math.round((totalHours / requiredHours) * 100)) : 0;
        const endDate = parseDateOnly(user.internship_end_date || "");
        const daysToEnd = endDate ? Math.ceil((endDate.getTime() - (parseDateOnly(dashboardToday) || new Date()).getTime()) / 86400000) : null;
        return { user, totalHours, requiredHours, percent, attendedDays, approvedLeaveDays, absentDays, plannedDays, remainingDays, daysToEnd };
      })
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 6);

    return {
      interns,
      todayRows,
      absent,
      progress,
      recentRows: dashboardRows.slice(0, 8),
      checkedOut: todayRows.filter((row) => row.status === "checked_out").length,
      late: todayRows.filter((row) => row.is_late).length,
      todayHours: todayRows.reduce((sum, row) => sum + numericHours(row), 0),
    };
  }, [dashboardLeaves, dashboardRows, dashboardToday, dashboardUsers]);

  const myProgress = useMemo(() => {
    if (!me) return null;
    const myRows = accountAttendance.filter((row) => row.user_id === me.id || attendanceCode(row) === (me.employee_code || me.intern_code || "-"));
    const myLeave = accountLeaves.filter((row) => row.user_id === me.id && row.status === "approved");
    const totalHours = myRows.reduce((sum, row) => sum + numericHours(row), 0);
    const attendedDays = new Set(myRows.map((row) => row.check_in_date).filter(Boolean)).size;
    const approvedLeaveDays = myLeave.reduce((sum, row) => sum + Number(row.total_days || 0), 0);
    const plannedDays = Number(me.required_days || 0) || countWeekdays(me.internship_start_date, me.internship_end_date);
    const elapsedDays = countWeekdays(me.internship_start_date, dashboardToday);
    const remainingDays = Math.max(0, countWeekdays(bangkokDateString(addDays(parseDateOnly(dashboardToday) || new Date(), 1)), me.internship_end_date));
    const absentDays = Math.max(0, elapsedDays - attendedDays - approvedLeaveDays);
    const requiredHours = Number(me.required_hours || 0);
    const percent = requiredHours > 0 ? Math.min(100, Math.round((totalHours / requiredHours) * 100)) : 0;
    const endDate = parseDateOnly(me.internship_end_date || "");
    const daysToEnd = endDate ? Math.ceil((endDate.getTime() - (parseDateOnly(dashboardToday) || new Date()).getTime()) / 86400000) : null;
    return { totalHours, attendedDays, approvedLeaveDays, absentDays, plannedDays, remainingDays, requiredHours, percent, daysToEnd };
  }, [accountAttendance, accountLeaves, dashboardToday, me]);

  async function login(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("pmc_token", data.token);
      setToken(data.token);
      setMe(data.user);
      setView("dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function apiJson(path: string, options: RequestInit = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(authHeaders || {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
    return data;
  }

  async function loadUsers(page = usersPage) {
    if (!authHeaders) return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", "50");
    const data = await apiJson(`/api/users?${params.toString()}`);
    setUsers(data.users);
    setUsersPagination(data.pagination || emptyPagination);
    setUsersPage(data.pagination?.page || page);
  }

  async function loadAttendance(page = attendancePage) {
    if (!authHeaders) return;
    const params = new URLSearchParams();
    if (attQ) params.set("q", attQ);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", "50");
    const data = await apiJson(`/api/attendance?${params.toString()}`);
    setAttendance(data.rows);
    setAttendancePagination(data.pagination || emptyPagination);
    setAttendancePage(data.pagination?.page || page);
  }

  async function loadDashboard() {
    if (!authHeaders) return;
    const [usersData, attendanceData, leaveData] = await Promise.all([
      apiJson("/api/users?role=intern&status=active"),
      apiJson("/api/attendance"),
      apiJson("/api/leave-requests"),
    ]);
    setDashboardUsers(usersData.users || []);
    setDashboardRows(attendanceData.rows || []);
    setDashboardLeaves(leaveData.rows || []);
  }

  async function loadReportAttendance() {
    if (!authHeaders) return;
    const params = new URLSearchParams();
    if (reportQ) params.set("q", reportQ);
    if (reportFrom) params.set("from", reportFrom);
    if (reportTo) params.set("to", reportTo);
    const data = await apiJson(`/api/attendance?${params.toString()}`);
    setReportRows(data.rows);
  }

  async function loadLeaveRequests(page = leavePage) {
    if (!authHeaders) return;
    const params = new URLSearchParams();
    if (leaveQ) params.set("q", leaveQ);
    if (leaveStatus) params.set("status", leaveStatus);
    if (leaveFrom) params.set("from", leaveFrom);
    if (leaveTo) params.set("to", leaveTo);
    params.set("page", String(page));
    params.set("pageSize", "50");
    const data = await apiJson(`/api/leave-requests?${params.toString()}`);
    setLeaveRequests(data.rows || []);
    setLeavePagination(data.pagination || emptyPagination);
    setLeavePage(data.pagination?.page || page);
  }

  async function loadAuditLogs(page = auditPage) {
    if (!authHeaders || me?.role !== "admin") return;
    const params = new URLSearchParams();
    if (auditQ) params.set("q", auditQ);
    if (auditAction) params.set("action", auditAction);
    if (auditFrom) params.set("from", auditFrom);
    if (auditTo) params.set("to", auditTo);
    params.set("page", String(page));
    params.set("pageSize", "50");
    const data = await apiJson(`/api/audit-log?${params.toString()}`);
    setAuditLogs(data.rows || []);
    setAuditPagination(data.pagination || emptyPagination);
    setAuditPage(data.pagination?.page || page);
  }

  async function submitLeaveRequest(event: React.FormEvent) {
    event.preventDefault();
    setLeaveSaving(true);
    setMessage("");
    try {
      await apiJson("/api/leave-requests", {
        method: "POST",
        body: JSON.stringify(leaveForm),
      });
      setLeaveForm(emptyLeaveForm);
      await loadLeaveRequests();
      await loadNotifications();
      setMessage("ส่งคำขอลาแล้ว รอ admin อนุมัติ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLeaveSaving(false);
    }
  }

  async function reviewLeaveRequestRow(row: LeaveRequest, status: "approved" | "rejected") {
    const defaultNote = status === "approved" ? "อนุมัติแล้ว" : "";
    const adminNote = window.prompt(status === "approved" ? "หมายเหตุการอนุมัติ (เว้นว่างได้)" : "เหตุผลที่ไม่อนุมัติ", defaultNote);
    if (adminNote === null) return;

    setMessage("");
    try {
      await apiJson(`/api/leave-requests/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, admin_note: adminNote }),
      });
      await loadLeaveRequests();
      await loadNotifications();
      setMessage(status === "approved" ? "อนุมัติคำขอลาแล้ว" : "บันทึกผลไม่อนุมัติแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function exportReportCsv() {
    const header = [
      "วันที่",
      "รหัส",
      "ชื่อ",
      "แผนก",
      "รูปแบบงาน",
      "เวลาเข้า",
      "เวลาออก",
      "ชั่วโมง",
      "สถานะ",
      "เช็คอินล่าช้า",
      "สถานที่",
      "หมายเหตุ",
    ];
    const rows = reportRows.map((row) => [
      row.check_in_date,
      attendanceCode(row),
      row.full_name,
      row.department || "",
      row.work_mode || "",
      row.check_in_time || "",
      row.check_out_time || "",
      row.total_hours_display || formatHoursValue(numericHours(row)),
      statusText(row),
      row.is_late ? "ใช่" : "ไม่ใช่",
      row.location_address || "",
      row.notes || "",
    ]);
    const csv = [header, ...rows].map((items) => items.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pmc-intern-attendance-${reportFrom || "all"}-${reportTo || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportReportSheet() {
    setReportExporting(true);
    setReportSheetUrl("");
    setMessage("");
    try {
      const data = await apiJson("/api/reports/export-sheet", {
        method: "POST",
        body: JSON.stringify({
          q: reportQ,
          from: reportFrom,
          to: reportTo,
          groupBy: reportGroupBy,
        }),
      });
      setReportSheetUrl(data.report.url);
      setMessage("สร้าง Google Sheet รายงานแล้ว");
      window.open(data.report.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setReportExporting(false);
    }
  }

  async function loadToday() {
    if (!authHeaders) return;
    const data = await apiJson("/api/attendance/today");
    setToday(data.today);
  }

  async function loadNotifications() {
    if (!authHeaders) return;
    const data = await apiJson("/api/notifications?limit=8");
    setNotifications(data.rows || []);
    setUnreadNotifications(data.unread || 0);
  }

  async function loadAccountData() {
    if (!authHeaders) return;
    const [attendanceData, leaveData] = await Promise.all([
      apiJson("/api/attendance"),
      apiJson("/api/leave-requests"),
    ]);
    setAccountAttendance(attendanceData.rows || []);
    setAccountLeaves(leaveData.rows || []);
  }

  async function markNotificationRead(item: NotificationItem) {
    if (!authHeaders) return;
    if (!item.read_at) {
      await apiJson(`/api/notifications/${item.id}`, { method: "PATCH" });
      await loadNotifications();
    }
    if (item.link) window.location.href = item.link;
  }

  async function markAllNotificationsRead() {
    if (!authHeaders || unreadNotifications === 0) return;
    await apiJson("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ all: true }),
    });
    await loadNotifications();
  }

  function openView(nextView: ViewKey) {
    setView(nextView);
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setSidebarOpen(false);
  }

  async function captureLocation() {
    setMessage("");
    if (!window.isSecureContext) {
      setMessage("เบราว์เซอร์ต้องเปิดผ่าน HTTPS หรือ localhost จึงจะอ่านพิกัดได้ ตอนนี้สามารถกรอกพิกัดเองเพื่อทดสอบก่อนได้");
      return;
    }
    if (!navigator.geolocation) {
      setMessage("เบราว์เซอร์นี้ไม่รองรับการอ่านพิกัด สามารถกรอกละติจูด/ลองจิจูดเองได้");
      return;
    }
    setLocating(true);
    setMessage("กำลังขอพิกัดจากอุปกรณ์...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setMessage("บันทึกพิกัดจากอุปกรณ์แล้ว");
        setLocating(false);
      },
      (error) => {
        const reason = error.code === error.PERMISSION_DENIED
          ? "ยังไม่ได้อนุญาตให้ระบบเข้าถึงตำแหน่ง"
          : error.code === error.POSITION_UNAVAILABLE
            ? "อุปกรณ์ยังระบุตำแหน่งไม่ได้"
            : error.code === error.TIMEOUT
              ? "รอพิกัดนานเกินไป"
              : "ไม่สามารถอ่านพิกัดจากอุปกรณ์ได้";
        setMessage(`${reason} สามารถกรอกละติจูด/ลองจิจูดเองเพื่อทดสอบได้`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submitCheckIn() {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiJson("/api/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({
          work_mode: workMode,
          location_lat: lat,
          location_lng: lng,
          location_address: locationAddress,
          selfieBase64,
        }),
      });
      setToday(data.record);
      await loadAttendance();
      setMessage("เช็คอินสำเร็จ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function submitCheckOut() {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiJson("/api/attendance/check-out", {
        method: "POST",
        body: JSON.stringify({ selfieBase64: checkoutSelfieBase64 }),
      });
      setToday(data.record);
      await loadAttendance();
      setMessage("เช็คเอาท์สำเร็จ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function deleteAttendanceRow(id: string) {
    if (!confirm("ลบรายการลงเวลานี้หรือไม่")) return;
    await apiJson(`/api/attendance/${id}`, { method: "DELETE" });
    await loadAttendance();
  }

  function openCreateUser() {
    setSelectedUser(null);
    setUserForm(emptyUserForm);
    setUserModalOpen(true);
  }

  function openEditUser(user: User) {
    setSelectedUser(user);
    setUserForm({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      role: user.role === "admin" ? "admin" : "intern",
      employee_code: user.employee_code || user.intern_code || "",
      student_id: user.student_id || "",
      university: user.university || "",
      faculty: user.faculty || "",
      major: user.major || "",
      department: user.department || "",
      mentor_name: user.mentor_name || "",
      position: user.position || "Intern",
      phone: user.phone || "",
      internship_start_date: user.internship_start_date || "",
      internship_end_date: user.internship_end_date || "",
      required_days: user.required_days || "",
      required_hours: user.required_hours || "",
      status: user.status || "active",
    });
    setUserModalOpen(true);
  }

  async function submitUser(event: React.FormEvent) {
    event.preventDefault();
    setUserSaving(true);
    setMessage("");
    try {
      const payload: Record<string, string> = {
        ...userForm,
        intern_code: userForm.employee_code,
      };
      if (selectedUser && !userForm.password) delete payload.password;
      await apiJson(selectedUser ? `/api/users/${selectedUser.id}` : "/api/users", {
        method: selectedUser ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setUserModalOpen(false);
      setSelectedUser(null);
      setUserForm(emptyUserForm);
      await loadUsers();
      setMessage(selectedUser ? "บันทึกการแก้ไขบัญชีแล้ว" : "เพิ่มบัญชีใหม่แล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUserSaving(false);
    }
  }

  async function deleteUserRow(user: User) {
    if (user.id === me?.id) {
      setMessage("ไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }
    if (!confirm(`ลบบัญชี ${user.full_name} หรือไม่`)) return;
    await apiJson(`/api/users/${user.id}`, { method: "DELETE" });
    await loadUsers();
    setMessage("ลบบัญชีแล้ว");
  }

  function openCorrection(row: Attendance) {
    setSelectedCorrection(row);
    setCorrectionForm({
      check_in_date: row.check_in_date || "",
      check_in_time: timeForInput(row.check_in_time),
      check_out_time: timeForInput(row.check_out_time),
      work_mode: row.work_mode || "Office",
      location_lat: row.location_lat || "",
      location_lng: row.location_lng || "",
      location_address: row.location_address || "",
      notes: row.notes || "",
      correction_reason: "",
    });
  }

  async function submitCorrection(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCorrection) return;
    setCorrectionSaving(true);
    setMessage("");
    try {
      await apiJson(`/api/attendance/${selectedCorrection.id}`, {
        method: "PATCH",
        body: JSON.stringify(correctionForm),
      });
      setSelectedCorrection(null);
      setCorrectionForm(emptyCorrectionForm);
      await loadAttendance();
      setMessage("บันทึกการแก้ไขรายการลงเวลาแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setCorrectionSaving(false);
    }
  }

  async function submitPasswordChange(event: React.FormEvent) {
    event.preventDefault();
    setPasswordSaving(true);
    setMessage("");
    try {
      await apiJson("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm(emptyPasswordForm);
      setMessage("เปลี่ยนรหัสผ่านเรียบร้อย");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileSaving(true);
    setMessage("");
    try {
      const data = await apiJson("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      if (data.token) {
        localStorage.setItem("pmc_token", data.token);
        setToken(data.token);
      }
      setMe(data.user);
      setProfileForm({
        full_name: data.user.full_name || "",
        phone: data.user.phone || "",
        profileImageBase64: "",
      });
      await loadAccountData();
      setMessage("บันทึกโปรไฟล์แล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setProfileSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: authHeaders || undefined,
    }).catch(() => undefined);
    localStorage.removeItem("pmc_token");
    setToken("");
    setMe(null);
    setUsers([]);
    setAttendance([]);
    setAccountAttendance([]);
    setAccountLeaves([]);
    setReportRows([]);
    setDashboardUsers([]);
    setDashboardRows([]);
    setDashboardLeaves([]);
    setLeaveRequests([]);
    setAuditLogs([]);
    setNotifications([]);
    setUnreadNotifications(0);
    setNotificationsOpen(false);
    setSelectedCorrection(null);
    setSelectedUser(null);
    setUserModalOpen(false);
    setLeaveForm(emptyLeaveForm);
    setPasswordForm(emptyPasswordForm);
    setProfileForm({ full_name: "", phone: "", profileImageBase64: "" });
    setToday(null);
    setMessage("");
  }

  useEffect(() => {
    const saved = localStorage.getItem("pmc_token") || "";
    if (!saved) return;
    setToken(saved);
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${saved}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setMe(data.user);
          setView("dashboard");
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!me || !token) return;
    loadNotifications().catch((error) => setMessage(error.message));
    if (view === "dashboard" && me.role === "admin") loadDashboard().catch((error) => setMessage(error.message));
    if (view === "dashboard" && me.role === "intern") {
      loadAccountData().catch((error) => setMessage(error.message));
      loadToday().catch((error) => setMessage(error.message));
    }
    if (view === "users" && me.role === "admin") loadUsers().catch((error) => setMessage(error.message));
    if (view === "attendance") loadAttendance().catch((error) => setMessage(error.message));
    if (view === "leave") loadLeaveRequests().catch((error) => setMessage(error.message));
    if (view === "reports" && me.role === "admin") loadReportAttendance().catch((error) => setMessage(error.message));
    if (view === "audit" && me.role === "admin") loadAuditLogs().catch((error) => setMessage(error.message));
    if (view === "account") loadAccountData().catch((error) => setMessage(error.message));
    if (view === "checkin") {
      loadToday().catch((error) => setMessage(error.message));
      loadAttendance().catch((error) => setMessage(error.message));
    }
  }, [me, token, view]);

  useEffect(() => {
    if (!me) return;
    setProfileForm((form) => ({
      full_name: form.full_name || me.full_name || "",
      phone: form.phone || me.phone || "",
      profileImageBase64: "",
    }));
  }, [me]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  if (!me) {
    return (
      <main className="login-shell">
        <section className="auth-stage" aria-label="เข้าสู่ระบบ PMC CONNEXT">
          <div className="auth-card auth-main">
            <div className="auth-welcome">
              <span>Welcome to</span>
              <div className="auth-mark">
                <img src="/mascot-wave.png" alt="" aria-hidden="true" />
              </div>
              <h1>PMC CONNEXT</h1>
              <p>ระบบลงเวลาและติดตามการฝึกงาน</p>
              <div className="auth-meta" aria-hidden="true">
                <span>INTERN PORTAL</span>
                <span>HR SYSTEM</span>
              </div>
            </div>

            <form className="auth-form" onSubmit={login}>
              <h2>เข้าสู่ระบบ</h2>
              <p>ใช้บัญชีที่ได้รับอนุญาตเพื่อบันทึกเวลาและติดตามการฝึกงาน</p>
              <label>
                อีเมล
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="username" />
              </label>
              <label>
                รหัสผ่าน
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="รหัสผ่าน" autoComplete="current-password" />
              </label>
              {message && <div className="notice">{message}</div>}
              <button disabled={loading} type="submit">
                <LogIn size={18} /> {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
              <small><LockKeyhole size={14} /> หากเข้าสู่ระบบไม่ได้ กรุณาติดต่อผู้ดูแลระบบ</small>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={sidebarOpen ? "app-shell sidebar-open" : "app-shell"}>
      <aside id="app-sidebar" className="sidebar" aria-label="เมนูหลัก">
        <div className="sidebar-brand">
          <img src="/login-logo.png" alt="บริษัทพิชยมงคล คอนสตรัคชั่น จำกัด" />
          <strong>Intern Attendance System</strong>
        </div>
        <span className="role-badge">{me.role === "admin" ? "ADMIN / HR" : "INTERN"}</span>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="ปิดเมนู" title="ปิดเมนู">
          <X size={18} /> ปิด
        </button>
        <nav>
          <button className={view === "dashboard" ? "nav-button active" : "nav-button"} onClick={() => openView("dashboard")}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          {me.role === "intern" && (
            <button className={view === "checkin" ? "nav-button active" : "nav-button"} onClick={() => openView("checkin")}>
              <Fingerprint size={18} /> ลงเวลาเข้า / ออก
            </button>
          )}
          {me.role === "intern" && (
            <button className={view === "leave" ? "nav-button active" : "nav-button"} onClick={() => openView("leave")}>
              <CalendarDays size={18} /> คำขอลา
            </button>
          )}
          <button className={view === "attendance" ? "nav-button active" : "nav-button"} onClick={() => openView("attendance")}>
            <Eye size={18} /> {me.role === "admin" ? "ตรวจสอบหลักฐานการลงเวลา" : "ประวัติของฉัน"}
          </button>
          {me.role === "admin" && (
            <>
              <button className={view === "leave" ? "nav-button active" : "nav-button"} onClick={() => openView("leave")}>
                <CalendarDays size={18} /> อนุมัติคำขอลา
              </button>
              <button className={view === "reports" ? "nav-button active" : "nav-button"} onClick={() => openView("reports")}>
                <BarChart3 size={18} /> รายงาน
              </button>
              <button className={view === "audit" ? "nav-button active" : "nav-button"} onClick={() => openView("audit")}>
                <ClipboardList size={18} /> ประวัติระบบ
              </button>
            </>
          )}
          {me.role === "admin" && (
            <button className={view === "users" ? "nav-button active" : "nav-button"} onClick={() => openView("users")}>
              <Users size={18} /> จัดการบัญชี
            </button>
          )}
          <button className={view === "account" ? "nav-button active" : "nav-button"} onClick={() => openView("account")}>
            <UserRound size={18} /> โปรไฟล์ของฉัน
          </button>
        </nav>
        <button className="ghost sidebar-logout" onClick={logout}>
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </aside>
      <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="ปิดเมนู" />

      <section className="workspace">
        <header className="topbar">
          <button
            className="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} /> เมนู
          </button>
          <div>
            <h1>{view === "leave" ? (me.role === "admin" ? "อนุมัติคำขอลา" : "คำขอลา") : view === "dashboard" ? "Dashboard" : view === "checkin" ? "ลงเวลาฝึกงาน" : view === "users" ? "จัดการบัญชี" : view === "reports" ? "รายงานการฝึกงาน" : view === "audit" ? "ประวัติระบบ" : view === "account" ? "โปรไฟล์ของฉัน" : "ตรวจสอบหลักฐานการลงเวลา"}</h1>
            <p>{view === "leave" ? (me.role === "admin" ? "ตรวจสอบและอนุมัติคำขอลาของนักศึกษา" : "ส่งคำขอลาและติดตามผลอนุมัติจาก admin") : view === "dashboard" ? `ภาพรวมการฝึกงานประจำวันที่ ${formatThaiDate(dashboardToday)}` : view === "checkin" ? "บันทึกเวลา พิกัด และหลักฐานการฝึกงานประจำวัน" : view === "users" ? "เพิ่ม ลด ค้นหา และกรองบัญชีผู้ใช้งานในระบบฝึกงาน" : view === "reports" ? "สรุปชั่วโมง สถานะการลงเวลา และส่งออกข้อมูลสำหรับ HR" : view === "audit" ? "ติดตามการเข้าสู่ระบบ การแก้ไขข้อมูล และการอนุมัติรายการสำคัญ" : view === "account" ? "ตรวจข้อมูลโปรไฟล์และเปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบ" : "ตรวจสอบเวลาเข้าออก สถานที่ และรูปหลักฐานของนักศึกษา"}</p>
          </div>
          <div className="topbar-actions">
            <div className="notification-menu">
              <button className="icon-button notification-button" onClick={() => setNotificationsOpen((open) => !open)} title="การแจ้งเตือน">
                <Bell size={19} />
                {unreadNotifications > 0 && <span>{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
              </button>
              {notificationsOpen && (
                <section className="notification-panel">
                  <div className="notification-header">
                    <strong>การแจ้งเตือน</strong>
                    <button className="ghost compact-button" onClick={markAllNotificationsRead} disabled={unreadNotifications === 0}>
                      <CheckCheck size={16} /> อ่านทั้งหมด
                    </button>
                  </div>
                  <div className="notification-list">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        className={item.read_at ? "notification-item" : "notification-item unread"}
                        onClick={() => markNotificationRead(item).catch((error) => setMessage(error.message))}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.message}</span>
                        <small>{item.created_at}</small>
                      </button>
                    ))}
                    {notifications.length === 0 && <div className="notification-empty">ยังไม่มีการแจ้งเตือน</div>}
                  </div>
                </section>
              )}
            </div>
          </div>
        </header>

        {message && <div className="page-notice">{message}</div>}

        {view === "dashboard" && me.role === "admin" && (
          <DashboardPanel
            data={dashboardData}
            today={dashboardToday}
            onOpenAttendance={() => setView("attendance")}
            onOpenReports={() => setView("reports")}
          />
        )}

        {view === "dashboard" && me.role === "intern" && (
          <InternDashboardPanel
            me={me}
            today={today}
            progress={myProgress}
            attendanceRows={accountAttendance}
            leaveRows={accountLeaves}
            todayDate={dashboardToday}
            onOpenCheckIn={() => setView("checkin")}
            onOpenLeave={() => setView("leave")}
            onOpenHistory={() => setView("attendance")}
          />
        )}

        {view === "checkin" && (
          <section className="checkin-layout">
            <div className="status-card">
              <div className="status-clock"><Clock3 size={22} /> วันนี้</div>
              <h2>{today ? statusText(today) : "ยังไม่ได้เช็คอิน"}</h2>
              <div className="status-grid">
                <span>เวลาเช็คอิน <strong>{today?.check_in_time || "-"}</strong></span>
                <span>เวลาเช็คเอาท์ <strong>{today?.check_out_time || "-"}</strong></span>
                <span>ชั่วโมงฝึกงาน <strong>{today?.total_hours_display || "-"}</strong></span>
                <span>รูปแบบ <strong>{today?.work_mode || "-"}</strong></span>
              </div>
              {today?.location_address && <p className="muted-line"><MapPin size={16} /> {today.location_address}</p>}
              {today && mapUrl(today) && <a className="evidence-link" href={mapUrl(today)} target="_blank" rel="noreferrer">เปิดพิกัดบน Google Maps</a>}
            </div>

            {!today && (
              <div className="action-card">
                <h3>เช็คอิน</h3>
                <div className="mode-grid">
                  {workModes.map((mode) => (
                    <button key={mode.value} className={workMode === mode.value ? "mode-card selected" : "mode-card"} onClick={() => setWorkMode(mode.value)}>
                      <strong>{mode.label}</strong><span>{mode.hint}</span>
                    </button>
                  ))}
                </div>
                <label>
                  คำอธิบายสถานที่
                  <input value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="เช่น สำนักงาน / ไซต์งาน / บ้านพัก" />
                </label>
                <div className="inline-actions">
                  <button className="ghost" onClick={captureLocation} disabled={locating}>
                    <MapPin size={18} /> {locating ? "กำลังดึงพิกัด..." : "ดึงพิกัด"}
                  </button>
                  <span>{lat && lng ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : "ยังไม่มีพิกัด"}</span>
                </div>
                <div className="coordinate-grid">
                  <label>
                    ละติจูด
                    <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="13.7563" />
                  </label>
                  <label>
                    ลองจิจูด
                    <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="100.5018" />
                  </label>
                </div>
                <RadiusMap lat={lat} lng={lng} label="ตำแหน่งที่ยืนยัน" />
                <label>
                  รูปเช็คอิน
                  <input type="file" accept="image/*" capture="user" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelfieBase64(await fileToBase64(file));
                  }} />
                </label>
                {selfieBase64 && <img className="selfie-preview" src={selfieBase64} alt="ตัวอย่างรูปเช็คอิน" />}
                <button disabled={loading} onClick={submitCheckIn}><Fingerprint size={18} /> เช็คอิน</button>
              </div>
            )}

            {today && !today.check_out_time && (
              <div className="action-card">
                <h3>เช็คเอาท์</h3>
                <p className="muted-line">ระบบจะคำนวณชั่วโมงจากเวลาเช็คอินของวันนี้</p>
                <label>
                  รูปเช็คเอาท์
                  <input type="file" accept="image/*" capture="user" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setCheckoutSelfieBase64(await fileToBase64(file));
                  }} />
                </label>
                {checkoutSelfieBase64 && <img className="selfie-preview" src={checkoutSelfieBase64} alt="ตัวอย่างรูปเช็คเอาท์" />}
                <button disabled={loading} onClick={submitCheckOut}><LogOut size={18} /> เช็คเอาท์</button>
              </div>
            )}
          </section>
        )}

        {view === "users" && me.role === "admin" && (
          <>
            <section className="filter-panel">
              <label><Search size={16} /> ค้นหา<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อ / อีเมล / รหัส" /></label>
              <label><Filter size={16} /> บทบาท<select value={role} onChange={(e) => setRole(e.target.value)}><option value="">ทั้งหมด</option><option value="admin">Admin</option><option value="intern">นักศึกษาฝึกงาน</option></select></label>
              <label>สถานะ<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">ทั้งหมด</option><option value="active">ใช้งาน</option><option value="inactive">ปิดใช้งาน</option></select></label>
              <button onClick={() => loadUsers(1)}><Search size={18} /> กรอง</button>
              <button className="ghost" onClick={openCreateUser}><UserPlus size={18} /> เพิ่มบัญชี</button>
            </section>
            <UsersTable users={users} onEdit={openEditUser} onDelete={deleteUserRow} />
            <PaginationControls pagination={usersPagination} onPageChange={loadUsers} />
          </>
        )}

        {view === "account" && (
          <section className="account-grid">
            <div className="dashboard-panel account-card">
              <div className="panel-heading">
                <div>
                  <span>PROFILE</span>
                  <h3>ข้อมูลบัญชี</h3>
                </div>
                <UserRound size={22} />
              </div>
              <dl className="account-details">
                <div><dt>ชื่อ</dt><dd>{me.full_name || "-"}</dd></div>
                <div><dt>อีเมล</dt><dd>{me.email || "-"}</dd></div>
                <div><dt>บทบาท</dt><dd>{me.role === "admin" ? "Admin / HR" : "Intern"}</dd></div>
                <div><dt>รหัส</dt><dd>{me.employee_code || me.intern_code || "-"}</dd></div>
                <div><dt>แผนก</dt><dd>{me.department || "-"}</dd></div>
              </dl>
            </div>

            <form className="dashboard-panel account-card profile-edit-card" onSubmit={submitProfile}>
              <div className="panel-heading">
                <div>
                  <span>EDIT PROFILE</span>
                  <h3>แก้ไขโปรไฟล์ส่วนตัว</h3>
                </div>
                <Camera size={22} />
              </div>
              <div className="profile-editor">
                <div className="profile-avatar">
                  {profileForm.profileImageBase64 || me.profile_image ? (
                    <img src={profileForm.profileImageBase64 || me.profile_image} alt="รูปโปรไฟล์" />
                  ) : (
                    <span>{profileInitials(me.full_name)}</span>
                  )}
                </div>
                <label>
                  รูปโปรไฟล์
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const image = await fileToBase64(file);
                      setProfileForm((form) => ({ ...form, profileImageBase64: image }));
                    }
                  }} />
                </label>
              </div>
              <label>
                ชื่อ-นามสกุล
                <input value={profileForm.full_name} onChange={(e) => setProfileForm((form) => ({ ...form, full_name: e.target.value }))} required />
              </label>
              <label>
                เบอร์โทร
                <input value={profileForm.phone} onChange={(e) => setProfileForm((form) => ({ ...form, phone: e.target.value }))} inputMode="tel" />
              </label>
              <button disabled={profileSaving}>
                <UserRound size={18} /> {profileSaving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
              </button>
            </form>

            {myProgress && (
              <section className="dashboard-panel account-card progress-detail-card">
                <div className="panel-heading">
                  <div>
                    <span>INTERNSHIP PROGRESS</span>
                    <h3>ความคืบหน้าการฝึกงาน</h3>
                  </div>
                  <BarChart3 size={22} />
                </div>
                <div className="progress-large">
                  <div>
                    <strong>{myProgress.percent}%</strong>
                    <span>{formatHoursValue(myProgress.totalHours)} / {myProgress.requiredHours ? formatHoursValue(myProgress.requiredHours) : "-"}</span>
                  </div>
                  <div className="progress-track"><span style={{ width: `${myProgress.percent}%` }} /></div>
                </div>
                <div className="progress-detail-grid">
                  <div><span>วันเข้าแล้ว</span><strong>{myProgress.attendedDays}</strong></div>
                  <div><span>วันลาอนุมัติ</span><strong>{myProgress.approvedLeaveDays}</strong></div>
                  <div><span>ขาด</span><strong>{myProgress.absentDays}</strong></div>
                  <div><span>วันฝึกที่เหลือ</span><strong>{myProgress.remainingDays}</strong></div>
                  <div><span>วันฝึกทั้งหมด</span><strong>{myProgress.plannedDays || "-"}</strong></div>
                  <div><span>ใกล้จบฝึกงาน</span><strong>{myProgress.daysToEnd === null ? "-" : `${Math.max(0, myProgress.daysToEnd)} วัน`}</strong></div>
                </div>
              </section>
            )}

            <form className="dashboard-panel account-card password-card" onSubmit={submitPasswordChange}>
              <div className="panel-heading">
                <div>
                  <span>SECURITY</span>
                  <h3>เปลี่ยนรหัสผ่าน</h3>
                </div>
                <KeyRound size={22} />
              </div>
              <label>
                รหัสผ่านปัจจุบัน
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((form) => ({ ...form, currentPassword: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                รหัสผ่านใหม่
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((form) => ({ ...form, newPassword: e.target.value }))}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
              <label>
                ยืนยันรหัสผ่านใหม่
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((form) => ({ ...form, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
              <button disabled={passwordSaving}>
                <KeyRound size={18} /> {passwordSaving ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              </button>
            </form>
          </section>
        )}

        {view === "reports" && me.role === "admin" && (
          <ReportsPanel
            rows={reportRows}
            groups={reportGroups}
            summary={reportSummary}
            q={reportQ}
            from={reportFrom}
            to={reportTo}
            groupBy={reportGroupBy}
            exportingSheet={reportExporting}
            sheetUrl={reportSheetUrl}
            onQ={setReportQ}
            onFrom={setReportFrom}
            onTo={setReportTo}
            onGroupBy={setReportGroupBy}
            onFilter={loadReportAttendance}
            onExport={exportReportCsv}
            onExportSheet={exportReportSheet}
          />
        )}

        {view === "audit" && me.role === "admin" && (
          <AuditLogPanel
            rows={auditLogs}
            q={auditQ}
            action={auditAction}
            from={auditFrom}
            to={auditTo}
            pagination={auditPagination}
            onQ={setAuditQ}
            onAction={setAuditAction}
            onFrom={setAuditFrom}
            onTo={setAuditTo}
            onFilter={() => loadAuditLogs(1)}
            onPageChange={loadAuditLogs}
          />
        )}

        {view === "leave" && (
          <LeaveRequestsPanel
            rows={leaveRequests}
            isAdmin={me.role === "admin"}
            form={leaveForm}
            q={leaveQ}
            status={leaveStatus}
            from={leaveFrom}
            to={leaveTo}
            pagination={leavePagination}
            saving={leaveSaving}
            onFormChange={setLeaveForm}
            onQ={setLeaveQ}
            onStatus={setLeaveStatus}
            onFrom={setLeaveFrom}
            onTo={setLeaveTo}
            onFilter={() => loadLeaveRequests(1)}
            onPageChange={loadLeaveRequests}
            onSubmit={submitLeaveRequest}
            onReview={reviewLeaveRequestRow}
          />
        )}

        {view === "attendance" && (
          <>
            <section className="filter-panel attendance-filter">
              <label><Search size={16} /> ค้นหา<input value={attQ} onChange={(e) => setAttQ(e.target.value)} placeholder="ชื่อ / รหัส / สถานที่" /></label>
              <label>ตั้งแต่<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label>ถึง<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
              <button onClick={() => loadAttendance(1)}><Search size={18} /> กรอง</button>
            </section>
            <AttendanceTable
              rows={attendance}
              isAdmin={me.role === "admin"}
              onEvidence={setSelectedEvidence}
              onEdit={openCorrection}
              onDelete={deleteAttendanceRow}
            />
            <PaginationControls pagination={attendancePagination} onPageChange={loadAttendance} />
          </>
        )}
      </section>

      {selectedEvidence && (
        <div className="modal-backdrop" onClick={() => setSelectedEvidence(null)}>
          <section className="evidence-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvidence(null)}>ปิด</button>
            <h2>{selectedEvidence.full_name}</h2>
            <p>{selectedEvidence.check_in_date} · เข้า {selectedEvidence.check_in_time} · ออก {selectedEvidence.check_out_time || "-"}</p>
            <div className="evidence-grid">
              {(selectedEvidence.checkin_selfie_url || selectedEvidence.selfie_url) && (
                <a href={selectedEvidence.checkin_selfie_url || selectedEvidence.selfie_url} target="_blank" rel="noreferrer">
                  <span>ภาพเช็คอิน</span>
                  <img src={selectedEvidence.checkin_selfie_url || selectedEvidence.selfie_url} alt="ภาพเช็คอิน" />
                </a>
              )}
              {selectedEvidence.checkout_selfie_url && (
                <a href={selectedEvidence.checkout_selfie_url} target="_blank" rel="noreferrer">
                  <span>ภาพเช็คเอาท์</span>
                  <img src={selectedEvidence.checkout_selfie_url} alt="ภาพเช็คเอาท์" />
                </a>
              )}
            </div>
            <div className="map-panel">
              <h3><MapPin size={18} /> ตำแหน่งเช็คอิน</h3>
              <p>{selectedEvidence.location_address || "ไม่มีคำอธิบายสถานที่"}</p>
              <RadiusMap
                lat={selectedEvidence.location_lat}
                lng={selectedEvidence.location_lng}
                label={selectedEvidence.full_name}
                compact
              />
              {mapUrl(selectedEvidence) ? <a href={mapUrl(selectedEvidence)} target="_blank" rel="noreferrer">เปิด Google Maps</a> : <span>ไม่มีพิกัด GPS</span>}
            </div>
          </section>
        </div>
      )}

      {userModalOpen && (
        <div className="modal-backdrop" onClick={() => setUserModalOpen(false)}>
          <form className="evidence-modal correction-modal user-modal" onSubmit={submitUser} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setUserModalOpen(false)}>ปิด</button>
            <h2>{selectedUser ? "แก้ไขบัญชี" : "เพิ่มบัญชี"}</h2>
            <p>{selectedUser ? "แก้ไขข้อมูลผู้ใช้งานและสถานะบัญชี" : "สร้างบัญชีสำหรับนักศึกษาฝึกงานหรือผู้ดูแลระบบ"}</p>
            <div className="correction-grid">
              <label>
                ชื่อ-นามสกุล
                <input value={userForm.full_name} onChange={(e) => setUserForm((form) => ({ ...form, full_name: e.target.value }))} required />
              </label>
              <label>
                อีเมล
                <input type="email" value={userForm.email} onChange={(e) => setUserForm((form) => ({ ...form, email: e.target.value }))} required />
              </label>
              <label>
                รหัสผ่าน
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((form) => ({ ...form, password: e.target.value }))}
                  placeholder={selectedUser ? "เว้นว่างถ้าไม่เปลี่ยน" : "รหัสผ่านเริ่มต้น"}
                  required={!selectedUser}
                />
              </label>
              <label>
                บทบาท
                <select value={userForm.role} onChange={(e) => setUserForm((form) => ({ ...form, role: e.target.value === "admin" ? "admin" : "intern" }))}>
                  <option value="intern">นักศึกษาฝึกงาน</option>
                  <option value="admin">Admin / HR</option>
                </select>
              </label>
              <label>
                รหัสนักศึกษา/พนักงาน
                <input value={userForm.employee_code} onChange={(e) => setUserForm((form) => ({ ...form, employee_code: e.target.value }))} />
              </label>
              <label>
                รหัสนักศึกษา
                <input value={userForm.student_id} onChange={(e) => setUserForm((form) => ({ ...form, student_id: e.target.value }))} />
              </label>
              <label>
                มหาวิทยาลัย
                <input value={userForm.university} onChange={(e) => setUserForm((form) => ({ ...form, university: e.target.value }))} />
              </label>
              <label>
                คณะ/สาขา
                <input value={userForm.faculty} onChange={(e) => setUserForm((form) => ({ ...form, faculty: e.target.value }))} />
              </label>
              <label>
                วิชาเอก
                <input value={userForm.major} onChange={(e) => setUserForm((form) => ({ ...form, major: e.target.value }))} />
              </label>
              <label>
                แผนก
                <input value={userForm.department} onChange={(e) => setUserForm((form) => ({ ...form, department: e.target.value }))} />
              </label>
              <label>
                พี่เลี้ยง
                <input value={userForm.mentor_name} onChange={(e) => setUserForm((form) => ({ ...form, mentor_name: e.target.value }))} />
              </label>
              <label>
                ตำแหน่ง
                <input value={userForm.position} onChange={(e) => setUserForm((form) => ({ ...form, position: e.target.value }))} />
              </label>
              <label>
                เบอร์โทร
                <input value={userForm.phone} onChange={(e) => setUserForm((form) => ({ ...form, phone: e.target.value }))} inputMode="tel" />
              </label>
              <label>
                สถานะ
                <select value={userForm.status} onChange={(e) => setUserForm((form) => ({ ...form, status: e.target.value }))}>
                  <option value="active">ใช้งาน</option>
                  <option value="inactive">ปิดใช้งาน</option>
                </select>
              </label>
              <label>
                วันเริ่มฝึก
                <input type="date" value={userForm.internship_start_date} onChange={(e) => setUserForm((form) => ({ ...form, internship_start_date: e.target.value }))} />
              </label>
              <label>
                วันสิ้นสุดฝึก
                <input type="date" value={userForm.internship_end_date} onChange={(e) => setUserForm((form) => ({ ...form, internship_end_date: e.target.value }))} />
              </label>
              <label>
                จำนวนวันที่ต้องฝึก
                <input value={userForm.required_days} onChange={(e) => setUserForm((form) => ({ ...form, required_days: e.target.value }))} inputMode="numeric" />
              </label>
              <label>
                ชั่วโมงที่ต้องฝึก
                <input value={userForm.required_hours} onChange={(e) => setUserForm((form) => ({ ...form, required_hours: e.target.value }))} inputMode="numeric" />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setUserModalOpen(false)}>ยกเลิก</button>
              <button type="submit" disabled={userSaving}>
                <UserPlus size={18} /> {userSaving ? "กำลังบันทึก..." : selectedUser ? "บันทึกบัญชี" : "เพิ่มบัญชี"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedCorrection && (
        <div className="modal-backdrop" onClick={() => setSelectedCorrection(null)}>
          <form className="evidence-modal correction-modal" onSubmit={submitCorrection} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedCorrection(null)}>ปิด</button>
            <h2>แก้ไขรายการลงเวลา</h2>
            <p>{selectedCorrection.full_name} · {selectedCorrection.employee_code || selectedCorrection.intern_code || "-"}</p>
            <div className="correction-grid">
              <label>
                วันที่
                <input
                  type="date"
                  value={correctionForm.check_in_date}
                  onChange={(e) => setCorrectionForm((form) => ({ ...form, check_in_date: e.target.value }))}
                  required
                />
              </label>
              <label>
                เวลาเข้า
                <input
                  type="time"
                  value={correctionForm.check_in_time}
                  onChange={(e) => setCorrectionForm((form) => ({ ...form, check_in_time: e.target.value }))}
                  required
                />
              </label>
              <label>
                เวลาออก
                <input
                  type="time"
                  value={correctionForm.check_out_time}
                  onChange={(e) => setCorrectionForm((form) => ({ ...form, check_out_time: e.target.value }))}
                />
              </label>
              <label>
                รูปแบบงาน
                <select
                  value={correctionForm.work_mode}
                  onChange={(e) => setCorrectionForm((form) => ({ ...form, work_mode: e.target.value }))}
                >
                  {workModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                </select>
              </label>
              <label>
                ละติจูด
                <input
                  value={correctionForm.location_lat}
                  onChange={(e) => setCorrectionForm((form) => ({ ...form, location_lat: e.target.value }))}
                  inputMode="decimal"
                />
              </label>
              <label>
                ลองจิจูด
                <input
                  value={correctionForm.location_lng}
                  onChange={(e) => setCorrectionForm((form) => ({ ...form, location_lng: e.target.value }))}
                  inputMode="decimal"
                />
              </label>
            </div>
            <label>
              สถานที่
              <input
                value={correctionForm.location_address}
                onChange={(e) => setCorrectionForm((form) => ({ ...form, location_address: e.target.value }))}
                placeholder="สำนักงาน / ไซต์งาน / บ้านพัก"
              />
            </label>
            <label>
              หมายเหตุ
              <textarea
                value={correctionForm.notes}
                onChange={(e) => setCorrectionForm((form) => ({ ...form, notes: e.target.value }))}
                rows={3}
              />
            </label>
            <label>
              เหตุผลการแก้ไข
              <textarea
                value={correctionForm.correction_reason}
                onChange={(e) => setCorrectionForm((form) => ({ ...form, correction_reason: e.target.value }))}
                rows={3}
                placeholder="เช่น นักศึกษาลืมเช็คเอาท์ / HR ตรวจหลักฐานแล้วปรับเวลา"
                required
              />
            </label>
            {(selectedCorrection.corrected_by || selectedCorrection.correction_reason) && (
              <div className="audit-note">
                แก้ไขล่าสุดโดย {selectedCorrection.corrected_by || "-"} · {selectedCorrection.correction_reason || "-"}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setSelectedCorrection(null)}>ยกเลิก</button>
              <button type="submit" disabled={correctionSaving}>
                <Pencil size={18} /> {correctionSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function UsersTable({
  users,
  onEdit,
  onDelete,
}: {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  return (
    <section className="table-card">
      <table>
        <thead><tr><th>รหัส</th><th>ชื่อ</th><th>อีเมล</th><th>แผนก</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.employee_code || user.intern_code || "-"}</td>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.department || "-"}</td>
              <td><span className="chip">{user.role}</span></td>
              <td>{user.status || "active"}</td>
              <td>
                <div className="row-actions">
                  <button className="icon-button" onClick={() => onEdit(user)} title="แก้ไข"><Pencil size={18} /></button>
                  <button className="icon-button danger" onClick={() => onDelete(user)} title="ลบ"><Trash2 size={18} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <div className="empty">ยังไม่มีข้อมูล หรือยังไม่ได้กดกรอง</div>}
    </section>
  );
}

function InternDashboardPanel({
  me,
  today,
  progress,
  attendanceRows,
  leaveRows,
  todayDate,
  onOpenCheckIn,
  onOpenLeave,
  onOpenHistory,
}: {
  me: User;
  today: Attendance | null;
  progress: {
    totalHours: number;
    attendedDays: number;
    approvedLeaveDays: number;
    absentDays: number;
    plannedDays: number;
    remainingDays: number;
    requiredHours: number;
    percent: number;
    daysToEnd: number | null;
  } | null;
  attendanceRows: Attendance[];
  leaveRows: LeaveRequest[];
  todayDate: string;
  onOpenCheckIn: () => void;
  onOpenLeave: () => void;
  onOpenHistory: () => void;
}) {
  const lateCount = attendanceRows.filter((row) => row.is_late).length;
  const missingCheckout = attendanceRows.filter((row) => row.status === "checked_in" && !row.check_out_time).length;
  const pendingLeaves = leaveRows.filter((row) => row.status === "pending").length;
  const recentLeaves = leaveRows.slice(0, 4);
  const recentAttendance = attendanceRows.slice(0, 5);
  const dayPercent = progress && progress.plannedDays > 0
    ? Math.min(100, Math.round(((progress.attendedDays + progress.approvedLeaveDays) / progress.plannedDays) * 100))
    : 0;
  const hourPercent = progress?.percent || 0;
  const todayStatus = today ? statusText(today) : "ยังไม่ได้เช็คอิน";

  return (
    <>
      <section className="intern-hero">
        <div>
          <span>วันนี้ {todayDate}</span>
          <h2>{todayStatus}</h2>
          <p>{me.full_name} · {me.employee_code || me.intern_code || "-"} · {me.department || "-"}</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={onOpenCheckIn}><Fingerprint size={18} /> ลงเวลา</button>
          <button className="ghost" onClick={onOpenLeave}><CalendarDays size={18} /> ขอลา</button>
        </div>
      </section>

      <section className="dashboard-metrics intern-metrics">
        <div><span>ชั่วโมงสะสม</span><strong>{formatHoursValue(progress?.totalHours || 0)}</strong></div>
        <div><span>วันเข้าแล้ว</span><strong>{progress?.attendedDays || 0}</strong></div>
        <div><span>วันลาอนุมัติ</span><strong>{progress?.approvedLeaveDays || 0}</strong></div>
        <div><span>วันขาด</span><strong>{progress?.absentDays || 0}</strong></div>
        <div><span>วันฝึกงานที่เหลือ</span><strong>{progress?.remainingDays || 0}</strong></div>
        <div><span>คำขอลารอตรวจ</span><strong>{pendingLeaves}</strong></div>
      </section>

      <section className="intern-dashboard-grid">
        <div className="dashboard-panel intern-progress-panel">
          <div className="panel-heading">
            <h3>ความคืบหน้าฝึกงาน</h3>
            {progress?.daysToEnd !== null && progress?.daysToEnd !== undefined && (
              <span className={progress.daysToEnd <= 14 ? "ending-soon-text" : ""}>
                คงเหลือ {Math.max(0, progress.daysToEnd)} วันตามปฏิทิน
              </span>
            )}
          </div>
          <div className="progress-large">
            <div>
              <span>ชั่วโมงครบตามเป้า</span>
              <strong>{hourPercent}%</strong>
            </div>
            <div className="progress-track"><span style={{ width: `${hourPercent}%` }} /></div>
          </div>
          <div className="progress-large secondary-progress">
            <div>
              <span>วันฝึกงานรวมวันลาอนุมัติ</span>
              <strong>{dayPercent}%</strong>
            </div>
            <div className="progress-track"><span style={{ width: `${dayPercent}%` }} /></div>
          </div>
          <div className="progress-detail-grid">
            <div><span>วันตามแผน</span><strong>{progress?.plannedDays || 0}</strong></div>
            <div><span>ชั่วโมงที่ต้องครบ</span><strong>{progress?.requiredHours || 0}</strong></div>
            <div><span>เช็คอินล่าช้า</span><strong>{lateCount}</strong></div>
            <div><span>ยังไม่เช็คเอาท์</span><strong>{missingCheckout}</strong></div>
          </div>
        </div>

        <div className="dashboard-panel today-panel">
          <div className="panel-heading">
            <h3>สถานะวันนี้</h3>
            <span>{today?.work_mode || "-"}</span>
          </div>
          <div className="status-grid">
            <span>เวลาเช็คอิน <strong>{today?.check_in_time || "-"}</strong></span>
            <span>เวลาเช็คเอาท์ <strong>{today?.check_out_time || "-"}</strong></span>
            <span>ชั่วโมงฝึกงาน <strong>{today?.total_hours_display || "-"}</strong></span>
            <span>สถานะ <strong>{todayStatus}</strong></span>
          </div>
          {today?.location_address && <p className="muted-line"><MapPin size={16} /> {today.location_address}</p>}
          {today && mapUrl(today) && <a className="evidence-link" href={mapUrl(today)} target="_blank" rel="noreferrer">เปิดพิกัดบน Google Maps</a>}
        </div>
      </section>

      <section className="intern-dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-heading">
            <h3>คำขอลาล่าสุด</h3>
            <button className="ghost compact-button" onClick={onOpenLeave}>ดูทั้งหมด</button>
          </div>
          <div className="mini-list">
            {recentLeaves.map((row) => (
              <div key={row.id} className="leave-mini-row">
                <strong>{row.leave_type}</strong>
                <span>{row.start_date} - {row.end_date} · {row.total_days} วัน</span>
                <span className={`leave-status ${row.status}`}>{leaveStatusText(row.status)}</span>
              </div>
            ))}
            {recentLeaves.length === 0 && <div className="mini-empty">ยังไม่มีคำขอลา</div>}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-heading">
            <h3>ประวัติล่าสุด</h3>
            <button className="ghost compact-button" onClick={onOpenHistory}>ดูประวัติ</button>
          </div>
          <div className="mini-list">
            {recentAttendance.map((row) => (
              <div key={row.id}>
                <strong>{row.check_in_date} · {statusText(row)}</strong>
                <span>{row.check_in_time || "-"} - {row.check_out_time || "-"} · {row.total_hours_display || "-"}</span>
              </div>
            ))}
            {recentAttendance.length === 0 && <div className="mini-empty">ยังไม่มีประวัติลงเวลา</div>}
          </div>
        </div>
      </section>
    </>
  );
}

function DashboardPanel({
  data,
  today,
  onOpenAttendance,
  onOpenReports,
}: {
  data: {
    interns: User[];
    todayRows: Attendance[];
    absent: User[];
    progress: Array<{
      user: User;
      totalHours: number;
      requiredHours: number;
      percent: number;
      attendedDays: number;
      approvedLeaveDays: number;
      absentDays: number;
      plannedDays: number;
      remainingDays: number;
      daysToEnd: number | null;
    }>;
    recentRows: Attendance[];
    checkedOut: number;
    late: number;
    todayHours: number;
  };
  today: string;
  onOpenAttendance: () => void;
  onOpenReports: () => void;
}) {
  const latestUpdate = data.recentRows[0]?.check_in_time ? `${data.recentRows[0].check_in_time} น.` : "-";

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span>วันนี้ {formatThaiDate(today)}</span>
          <h2>{data.todayRows.length} / {data.interns.length} เช็คอินแล้ว</h2>
          <p>ติดตามสถานะการเช็คอินและชั่วโมงฝึกงานของนักศึกษาวันนี้</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={onOpenAttendance}><Eye size={18} /> ตรวจสอบหลักฐาน</button>
          <button className="ghost" onClick={onOpenReports}><BarChart3 size={18} /> รายงาน</button>
        </div>
      </section>

      <section className="dashboard-metrics">
        <div><span>นักศึกษาทั้งหมด</span><strong>{data.interns.length}</strong></div>
        <div><span>เช็คอินวันนี้</span><strong>{data.todayRows.length}</strong></div>
        <div><span>ยังไม่เช็คอิน</span><strong>{data.absent.length}</strong></div>
        <div><span>เช็คเอาท์แล้ว</span><strong>{data.checkedOut}</strong></div>
        <div><span>เช็คอินล่าช้า</span><strong>{data.late}</strong></div>
        <div><span>ชั่วโมงวันนี้</span><strong>{formatHoursValue(data.todayHours)}</strong></div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-heading">
            <h3>ยังไม่เช็คอิน</h3>
            <span>{data.absent.length} คน</span>
          </div>
          <div className="mini-list">
            {data.absent.slice(0, 8).map((user) => (
              <div key={user.id}>
                <strong>{user.full_name}</strong>
                <span>{user.employee_code || user.intern_code || "-"} · {user.department || "-"}</span>
              </div>
            ))}
            {data.absent.length === 0 && (
              <div className="mini-empty success-state">
                <CheckCircle2 size={20} />
                <strong>ทุกคนเช็คอินแล้ว</strong>
                <span>ไม่มีนักศึกษาที่รอเช็คอินในวันนี้</span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-heading">
            <h3>ชั่วโมงสะสม</h3>
            <span>Top {data.progress.length}</span>
          </div>
          <div className="progress-list">
            {data.progress.map((item) => (
              <div key={item.user.id} className="progress-row">
                <div>
                  <strong>{item.user.full_name}</strong>
                  <span>{formatHoursValue(item.totalHours)}{item.requiredHours ? ` / ${item.requiredHours} ชม.` : ""}</span>
                </div>
                <div className="progress-track"><span style={{ width: `${item.percent}%` }} /></div>
                <div className="progress-mini-metrics">
                  <span>เข้า {item.attendedDays}</span>
                  <span>ลา {item.approvedLeaveDays}</span>
                  <span>ขาด {item.absentDays}</span>
                  <span>คงเหลือ {item.remainingDays} วันฝึกงาน</span>
                  {item.daysToEnd !== null && item.daysToEnd <= 14 && <span className="ending-soon">ใกล้จบ {Math.max(0, item.daysToEnd)} วัน</span>}
                </div>
              </div>
            ))}
            {data.progress.length === 0 && <div className="mini-empty">ยังไม่มีข้อมูลชั่วโมงสะสม</div>}
          </div>
        </div>
      </section>

      <div className="table-section-header">
        <div>
          <h3>รายการเช็คอินวันนี้</h3>
          <span>รายการลงเวลาล่าสุดของนักศึกษา</span>
        </div>
        <span>อัปเดตล่าสุด {latestUpdate}</span>
      </div>

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>นักศึกษา</th>
              <th>แผนก</th>
              <th>เวลาเช็คอิน</th>
              <th>เวลาเช็คเอาท์</th>
              <th>ชั่วโมงฝึกงาน</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.recentRows.map((row) => (
              <tr key={row.id}>
                <td>{formatThaiDate(row.check_in_date)}</td>
                <td><strong>{row.full_name}</strong><small>{attendanceCode(row)}</small></td>
                <td>{row.department || "-"}</td>
                <td>{row.check_in_time || "-"}</td>
                <td>{row.check_out_time || "-"}</td>
                <td>{row.total_hours_display || "-"}</td>
                <td><span className={statusChipClass(row)}>{statusText(row)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.recentRows.length === 0 && <div className="empty">ยังไม่มีรายการลงเวลาล่าสุด</div>}
      </section>
    </>
  );
}

function AuditLogPanel({
  rows,
  q,
  action,
  from,
  to,
  pagination,
  onQ,
  onAction,
  onFrom,
  onTo,
  onFilter,
  onPageChange,
}: {
  rows: AuditLog[];
  q: string;
  action: string;
  from: string;
  to: string;
  pagination: PaginationMeta;
  onQ: (value: string) => void;
  onAction: (value: string) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onFilter: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <section className="filter-panel audit-filter">
        <label><Search size={16} /> ค้นหา<input value={q} onChange={(e) => onQ(e.target.value)} placeholder="ผู้ใช้ / action / รายละเอียด" /></label>
        <label>
          Action
          <select value={action} onChange={(e) => onAction(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="LOGIN">เข้าสู่ระบบ</option>
            <option value="LOGIN_FAILED">เข้าสู่ระบบไม่สำเร็จ</option>
            <option value="CHANGE_PASSWORD">เปลี่ยนรหัสผ่าน</option>
            <option value="CREATE_USER">เพิ่มบัญชี</option>
            <option value="UPDATE_USER">แก้ไขบัญชี</option>
            <option value="DELETE_USER">ลบบัญชี</option>
            <option value="UPDATE_ATTENDANCE">แก้ไขเวลา</option>
            <option value="DELETE_ATTENDANCE">ลบเวลา</option>
            <option value="LEAVE_APPROVE">อนุมัติลา</option>
            <option value="LEAVE_REJECT">ไม่อนุมัติลา</option>
          </select>
        </label>
        <label>ตั้งแต่<input type="date" value={from} onChange={(e) => onFrom(e.target.value)} /></label>
        <label>ถึง<input type="date" value={to} onChange={(e) => onTo(e.target.value)} /></label>
        <button onClick={onFilter}><Search size={18} /> กรอง</button>
      </section>

      <section className="table-card audit-table">
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ผู้ใช้</th>
              <th>Action</th>
              <th>เป้าหมาย</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.created_at ? new Date(row.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "-"}</td>
                <td><strong>{row.user_name || "-"}</strong></td>
                <td><span className="audit-action">{auditActionText(row.action)}</span></td>
                <td>{row.target_type || "-"}{row.target_id ? ` / ${row.target_id.slice(0, 12)}` : ""}</td>
                <td>{auditDetailsText(row.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">ยังไม่มีประวัติระบบตามเงื่อนไขนี้</div>}
      </section>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </>
  );
}

function ReportsPanel({
  rows,
  groups,
  summary,
  q,
  from,
  to,
  groupBy,
  exportingSheet,
  sheetUrl,
  onQ,
  onFrom,
  onTo,
  onGroupBy,
  onFilter,
  onExport,
  onExportSheet,
}: {
  rows: Attendance[];
  groups: Array<{
    key: string;
    label: string;
    rows: number;
    checkedOut: number;
    late: number;
    totalHours: number;
    firstDate: string;
    lastDate: string;
    dayCount: number;
    internCount: number;
  }>;
  summary: {
    totalRows: number;
    checkedOut: number;
    late: number;
    interns: number;
    totalHours: number;
  };
  q: string;
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  exportingSheet: boolean;
  sheetUrl: string;
  onQ: (value: string) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onGroupBy: (value: ReportGroupBy) => void;
  onFilter: () => void;
  onExport: () => void;
  onExportSheet: () => void;
}) {
  return (
    <>
      <section className="filter-panel report-filter">
        <label><Search size={16} /> ค้นหา<input value={q} onChange={(e) => onQ(e.target.value)} placeholder="ชื่อ / รหัส / แผนก" /></label>
        <label>ตั้งแต่<input type="date" value={from} onChange={(e) => onFrom(e.target.value)} /></label>
        <label>ถึง<input type="date" value={to} onChange={(e) => onTo(e.target.value)} /></label>
        <button onClick={onFilter}><Search size={18} /> สรุปรายงาน</button>
        <label>
          Group by
          <select value={groupBy} onChange={(e) => onGroupBy(e.target.value as ReportGroupBy)}>
            <option value="user">นักศึกษา</option>
            <option value="department">แผนก</option>
            <option value="university">มหาวิทยาลัย</option>
            <option value="work_mode">รูปแบบงาน</option>
            <option value="date">วันที่</option>
          </select>
        </label>
        <button className="ghost" onClick={onExport} disabled={rows.length === 0}><Download size={18} /> Export CSV</button>
        <button className="ghost" onClick={onExportSheet} disabled={rows.length === 0 || exportingSheet}>
          <FileSpreadsheet size={18} /> {exportingSheet ? "Creating..." : "Export Google Sheet"}
        </button>
      </section>

      {sheetUrl && <a className="sheet-export-link" href={sheetUrl} target="_blank" rel="noreferrer">เปิด Google Sheet รายงานล่าสุด</a>}

      <section className="report-metrics">
        <div><span>รายการทั้งหมด</span><strong>{summary.totalRows}</strong></div>
        <div><span>นักศึกษา</span><strong>{summary.interns}</strong></div>
        <div><span>เช็คเอาท์แล้ว</span><strong>{summary.checkedOut}</strong></div>
        <div><span>เช็คอินล่าช้า</span><strong>{summary.late}</strong></div>
        <div><span>ชั่วโมงรวม</span><strong>{formatHoursValue(summary.totalHours)}</strong></div>
      </section>

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>{groupByLabel(groupBy)}</th>
              <th>จำนวนคน</th>
              <th>เช็คเอาท์แล้ว</th>
              <th>วันที่ลงเวลา</th>
              <th>จำนวนรายการ</th>
              <th>เช็คอินล่าช้า</th>
              <th>ชั่วโมงรวม</th>
              <th>ช่วงวันที่</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.key}>
                <td><strong>{group.label}</strong></td>
                <td>{group.internCount}</td>
                <td>{group.checkedOut}</td>
                <td>{group.dayCount}</td>
                <td>{group.rows}</td>
                <td>{group.late}</td>
                <td>{formatHoursValue(group.totalHours)}</td>
                <td>{group.firstDate || "-"} - {group.lastDate || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {groups.length === 0 && <div className="empty">ยังไม่มีข้อมูลรายงานตามเงื่อนไขนี้</div>}
      </section>
    </>
  );
}

function LeaveRequestsPanel({
  rows,
  isAdmin,
  form,
  q,
  status,
  from,
  to,
  pagination,
  saving,
  onFormChange,
  onQ,
  onStatus,
  onFrom,
  onTo,
  onFilter,
  onPageChange,
  onSubmit,
  onReview,
}: {
  rows: LeaveRequest[];
  isAdmin: boolean;
  form: LeaveForm;
  q: string;
  status: string;
  from: string;
  to: string;
  pagination: PaginationMeta;
  saving: boolean;
  onFormChange: React.Dispatch<React.SetStateAction<LeaveForm>>;
  onQ: (value: string) => void;
  onStatus: (value: string) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onFilter: () => void;
  onPageChange: (page: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  onReview: (row: LeaveRequest, status: "approved" | "rejected") => void;
}) {
  return (
    <section className="leave-layout">
      {!isAdmin && (
        <form className="action-card leave-form" onSubmit={onSubmit}>
          <div className="panel-heading">
            <h3>ส่งคำขอลา</h3>
            <span>รอ admin อนุมัติ</span>
          </div>
          <div className="leave-form-grid">
            <label>
              ประเภทการลา
              <select value={form.leave_type} onChange={(e) => onFormChange((current) => ({ ...current, leave_type: e.target.value }))}>
                <option value="ลากิจ">ลากิจ</option>
                <option value="ลาป่วย">ลาป่วย</option>
                <option value="ลาพักร้อน">ลาพักร้อน</option>
                <option value="อื่น ๆ">อื่น ๆ</option>
              </select>
            </label>
            <label>
              วันที่เริ่มลา
              <input type="date" value={form.start_date} onChange={(e) => onFormChange((current) => ({ ...current, start_date: e.target.value }))} required />
            </label>
            <label>
              วันที่สิ้นสุด
              <input type="date" value={form.end_date} onChange={(e) => onFormChange((current) => ({ ...current, end_date: e.target.value }))} required />
            </label>
          </div>
          <label>
            เหตุผล
            <textarea
              rows={4}
              value={form.reason}
              onChange={(e) => onFormChange((current) => ({ ...current, reason: e.target.value }))}
              placeholder="ระบุเหตุผลและรายละเอียดที่ admin ควรทราบ"
              required
            />
          </label>
          <label className="attachment-picker">
            <span><Paperclip size={16} /> ไฟล์แนบ</span>
            <input
              key={form.attachmentName ? "leave-attachment-selected" : "leave-attachment-empty"}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  onFormChange((current) => ({ ...current, attachmentBase64: "", attachmentName: "" }));
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  alert("ไฟล์แนบต้องมีขนาดไม่เกิน 10 MB");
                  e.currentTarget.value = "";
                  return;
                }
                const base64 = await fileToBase64(file);
                onFormChange((current) => ({ ...current, attachmentBase64: base64, attachmentName: file.name }));
              }}
            />
            {form.attachmentName && (
              <small>
                <Paperclip size={14} /> {form.attachmentName}
                <button
                  type="button"
                  className="inline-icon-button"
                  title="ลบไฟล์แนบ"
                  onClick={() => onFormChange((current) => ({ ...current, attachmentBase64: "", attachmentName: "" }))}
                >
                  <X size={14} />
                </button>
              </small>
            )}
          </label>
          <button type="submit" disabled={saving}>
            <CalendarDays size={18} /> {saving ? "กำลังส่งคำขอ..." : "ส่งคำขอลา"}
          </button>
        </form>
      )}

      <section className="filter-panel leave-filter">
        {isAdmin && <label><Search size={16} /> ค้นหา<input value={q} onChange={(e) => onQ(e.target.value)} placeholder="ชื่อ / รหัส / แผนก / เหตุผล" /></label>}
        <label><Filter size={16} /> สถานะ<select value={status} onChange={(e) => onStatus(e.target.value)}><option value="">ทั้งหมด</option><option value="pending">รออนุมัติ</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ไม่อนุมัติ</option></select></label>
        <label>ตั้งแต่<input type="date" value={from} onChange={(e) => onFrom(e.target.value)} /></label>
        <label>ถึง<input type="date" value={to} onChange={(e) => onTo(e.target.value)} /></label>
        <button type="button" onClick={onFilter}><Search size={18} /> กรอง</button>
      </section>

      <section className="table-card leave-table">
        <table>
          <thead>
            <tr>
              <th>สถานะ</th>
              <th>ประเภท</th>
              <th>ช่วงวันที่</th>
              <th>จำนวนวัน</th>
              <th>นักศึกษา</th>
              <th>เหตุผล</th>
              <th>ไฟล์แนบ</th>
              <th>หมายเหตุ admin</th>
              {isAdmin && <th>จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><span className={`leave-status ${row.status}`}>{leaveStatusText(row.status)}</span></td>
                <td>{row.leave_type}</td>
                <td>{row.start_date} ถึง {row.end_date}</td>
                <td>{row.total_days}</td>
                <td><strong>{row.full_name}</strong><small>{row.employee_code || row.intern_code || "-"} · {row.department || "-"}</small></td>
                <td className="leave-reason">{row.reason}</td>
                <td>
                  {row.attachment_url ? (
                    <a className="attachment-link" href={row.attachment_url} target="_blank" rel="noreferrer">
                      <Paperclip size={16} /> {row.attachment_name || "เปิดไฟล์"}
                    </a>
                  ) : (
                    <span className="muted-small">-</span>
                  )}
                </td>
                <td className="leave-reason">{row.admin_note || "-"}{row.reviewed_by && <small>{row.reviewed_by}</small>}</td>
                {isAdmin && (
                  <td>
                    {row.status === "pending" ? (
                      <div className="row-actions leave-actions">
                        <button className="icon-button success" onClick={() => onReview(row, "approved")} title="อนุมัติ"><CheckCircle2 size={18} /></button>
                        <button className="icon-button danger" onClick={() => onReview(row, "rejected")} title="ไม่อนุมัติ"><XCircle size={18} /></button>
                      </div>
                    ) : (
                      <span className="muted-small">{row.reviewed_at || "-"}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">ยังไม่มีคำขอลาตามเงื่อนไขนี้</div>}
      </section>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </section>
  );
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  if (!pagination.total || pagination.totalPages <= 1) return null;
  return (
    <nav className="pagination-bar" aria-label="pagination">
      <span>
        {pagination.total} รายการ · หน้า {pagination.page} / {pagination.totalPages} · แสดงหน้าละ {pagination.pageSize}
      </span>
      <div>
        <button className="icon-button" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} title="หน้าก่อนหน้า">
          <ChevronLeft size={18} />
        </button>
        <button className="icon-button" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} title="หน้าถัดไป">
          <ChevronRight size={18} />
        </button>
      </div>
    </nav>
  );
}

function AttendanceTable({
  rows,
  isAdmin,
  onEvidence,
  onEdit,
  onDelete,
}: {
  rows: Attendance[];
  isAdmin: boolean;
  onEvidence: (row: Attendance) => void;
  onEdit: (row: Attendance) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="table-card">
      <table>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>นักศึกษา</th>
            <th>แผนก</th>
            <th>สถานที่ฝึก</th>
            <th>เวลาเช็คอิน</th>
            <th>เวลาเช็คเอาท์</th>
            <th>ชั่วโมงฝึกงาน</th>
            <th>สถานะ</th>
            <th>หลักฐาน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.check_in_date}</td>
              <td><strong>{row.full_name}</strong><small>{row.employee_code || row.intern_code}</small></td>
              <td>{row.department || "-"}</td>
              <td className="location-cell">{row.location_address || "-"}{mapUrl(row) && <a href={mapUrl(row)} target="_blank" rel="noreferrer">แผนที่</a>}</td>
              <td>{row.check_in_time || "-"}</td>
              <td>{row.check_out_time || "-"}</td>
              <td>{row.total_hours_display || "-"}</td>
              <td><span className={statusChipClass(row)}>{statusText(row)}</span></td>
              <td>
                <div className="row-actions">
                  <button className="icon-button" onClick={() => onEvidence(row)} title="ตรวจหลักฐาน"><Eye size={18} /></button>
                  {isAdmin && <button className="icon-button" onClick={() => onEdit(row)} title="แก้ไข"><Pencil size={18} /></button>}
                  {isAdmin && <button className="icon-button danger" onClick={() => onDelete(row.id)} title="ลบ"><Trash2 size={18} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="empty">ยังไม่มีข้อมูล หรือยังไม่ได้กดกรอง</div>}
    </section>
  );
}
