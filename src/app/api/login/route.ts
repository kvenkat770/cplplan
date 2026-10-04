import { NextResponse } from "next/server";
import { COOKIE, createSession, sameSecret } from "@/lib/auth";

export const runtime = "nodejs";

/** Deliberately slow and vague: no hint about whether a password was close. */
export async function POST(req: Request) {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "The app has no password configured." }, { status: 500 });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* fall through to the failure below */
  }

  await new Promise((r) => setTimeout(r, 400)); // slows brute force to a crawl

  if (!sameSecret(password, expected)) {
    return NextResponse.json({ error: "That password does not match." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
