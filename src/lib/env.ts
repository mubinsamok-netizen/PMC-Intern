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
const publicAppUrlFallback = nextAuthUrl.startsWith("https://")
    ? nextAuthUrl
  : vercelUrl
    ? `https://${vercelUrl}`
    : "https://pmc-intern.vercel.app";

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
    cardHeroImageUrl: readEnv("LINE_CARD_HERO_IMAGE_URL", ""),
    checkinHeroImageUrl: readEnv("LINE_CHECKIN_HERO_IMAGE_URL", ""),
    siteHeroImageUrl: readEnv("LINE_SITE_HERO_IMAGE_URL", ""),
    leaveHeroImageUrl: readEnv("LINE_LEAVE_HERO_IMAGE_URL", ""),
    checkoutHeroImageUrl: readEnv("LINE_CHECKOUT_HERO_IMAGE_URL", ""),
  },
};
