import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login"];
const publicPrefix = "/api/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return NextResponse.next();
  if (pathname.startsWith(publicPrefix)) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
