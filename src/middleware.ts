import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApiRoute = path.startsWith("/api/clients");

  // Allow the database health check endpoint without auth
  if (isApiRoute && request.nextUrl.searchParams.get("check") === "true") {
    return NextResponse.next();
  }

  // Define public paths that don't require authentication
  const isPublicPath = path === "/login";
  
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // API routes: return 401 JSON instead of redirecting
  if (isApiRoute && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Page routes: redirect to login if not authenticated
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to dashboard if already authenticated and trying to access login
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/clients/:path*", "/login", "/api/clients/:path*"],
};