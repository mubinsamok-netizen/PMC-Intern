import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "pmc_session";

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "intern";
  department?: string;
  intern_code?: string;
  employee_code?: string;
  profile_image?: string;
};

type SessionPayload = {
  user: SessionUser;
};

export function signSession(user: SessionUser) {
  return jwt.sign({ user } satisfies SessionPayload, env.jwtSecret, {
    expiresIn: `${env.sessionTtlHours}h`,
  });
}

export function verifySession(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as SessionPayload;
    return decoded.user || null;
  } catch {
    return null;
  }
}

export async function readSessionFromCookies() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value || "";
  return token ? verifySession(token) : null;
}

export function readSessionFromRequest(req: NextRequest) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const cookieToken = req.cookies.get(SESSION_COOKIE)?.value || "";
  const token = bearer || cookieToken;
  return token ? verifySession(token) : null;
}
