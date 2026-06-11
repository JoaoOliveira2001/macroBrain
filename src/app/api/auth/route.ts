import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "macrobrain_session";
const SESSION_VALUE = "authenticated";

function isAuthorized(request: NextRequest): boolean {
  const password = process.env.MACROBRAIN_PASSWORD;
  if (!password) return true;

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  return session === SESSION_VALUE;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAuthorized(request) });
}

export async function POST(request: NextRequest) {
  const password = process.env.MACROBRAIN_PASSWORD;
  if (!password) {
    return NextResponse.json({ authenticated: true, message: "Auth desabilitado em dev" });
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.password !== password) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
