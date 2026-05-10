function readEnv(key: string, fallback = "") {
  return process.env[key] || fallback;
}

function requiredEnv(key: string) {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

const vercelUrl = readEnv("VERCEL_URL");
const nextAuthUrl = readEnv("NEXTAUTH_URL");
const publicAppUrlFallback = vercelUrl
  ? `https://${vercelUrl}`
  : nextAuthUrl.startsWith("https://")
    ? nextAuthUrl
    : "https://pmc-intern-web.vercel.app";

export const env = {
  appName: readEnv("NEXT_PUBLIC_APP_NAME", "PMC Intern Attendance"),
  appVersion: readEnv("NEXT_PUBLIC_APP_VERSION", "1.0.0"),
  publicAppUrl: readEnv("NEXT_PUBLIC_APP_URL", publicAppUrlFallback).replace(/\/+$/, ""),
  timezone: readEnv("APP_TIMEZONE", "Asia/Bangkok"),
  locale: readEnv("APP_LOCALE", "th-TH"),
  jwtSecret: readEnv("JWT_SECRET", readEnv("NEXTAUTH_SECRET", "development-secret")),
  sessionTtlHours: Number(readEnv("SESSION_TTL_HOURS", "8")),
  cronSecret: readEnv("CRON_SECRET", ""),
  google: {
    serviceAccountEmail: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    sheetId: requiredEnv("GOOGLE_SHEET_ID"),
    driveRootFolderId: requiredEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID"),
  },
  line: {
    enabled: readEnv("LINE_ENABLED", "false") === "true",
    channelAccessToken: readEnv("LINE_CHANNEL_ACCESS_TOKEN", ""),
    groupId: readEnv("LINE_GROUP_ID", ""),
    stickerPackageId: readEnv("LINE_STICKER_PACKAGE_ID", "11537"),
    stickerCheckInId: readEnv("LINE_STICKER_CHECKIN_ID", "52002735"),
    stickerCheckOutId: readEnv("LINE_STICKER_CHECKOUT_ID", "52002735"),
    stickerLeaveId: readEnv("LINE_STICKER_LEAVE_ID", "52002735"),
    stickerSummaryId: readEnv("LINE_STICKER_SUMMARY_ID", "52002735"),
    stickerReminderId: readEnv("LINE_STICKER_REMINDER_ID", "52002735"),
  },
};
