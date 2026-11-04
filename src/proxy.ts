// Request gate (Next.js 16 proxy): switched-off modules answer "not found"; with sign-in on,
// requests without a session cookie go to /login. Sessions are verified in pages and actions.
import { NextResponse, type NextRequest } from "next/server";
import { loadConfig } from "@/lib/config";
import { proxyDecision } from "@/lib/proxy-decision";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

const appConfig = loadConfig();

export function proxy(req: NextRequest) {
  const d = proxyDecision(req.nextUrl.pathname, { hasSession: !!req.cookies.get(SESSION_COOKIE)?.value }, appConfig);
  switch (d.kind) {
    case "pass": return NextResponse.next();
    case "not_found": return new NextResponse("Not found", { status: 404 });
    case "unauthorized": return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    case "redirect": return NextResponse.redirect(new URL(d.to, req.url));
    case "login": { const u = new URL("/login", req.url); u.searchParams.set("next", d.next); return NextResponse.redirect(u); }
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
