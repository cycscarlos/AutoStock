// REFERENCIA: proxy.ts de AutoStock
// Muestra cómo se integra el license guard. Adaptar al proxy.ts de MedStock.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProduction = process.env.NODE_ENV === "production";
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");
  const isLicenseRoute = pathname.startsWith("/license") || pathname.startsWith("/api/license/");

  // ========== LICENSE GUARD (solo en producción) ==========
  if (isProduction) {
    // Bloquear admin/licenses en producción
    if (pathname.startsWith("/admin/licenses") || pathname.startsWith("/api/admin/")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Verificar licencia activa (excepto en rutas de licencia y login)
    if (!isLicenseRoute && !isLoginPage) {
      try {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          process.env.SUPABASE_SERVICE_ROLE_KEY || "",
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: licencias } = await adminClient
          .from("aut_licenses")
          .select("expires_at")
          .eq("is_active", true)
          .order("id", { ascending: false })
          .limit(1);

        if (!licencias || licencias.length === 0) {
          const dest = new URL("/license", request.url);
          return NextResponse.redirect(dest);
        }

        const expiresAt = new Date(licencias[0].expires_at);
        const now = new Date();
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0) {
          return NextResponse.redirect(new URL("/license?expired=1", request.url));
        }
      } catch (err) {
        console.error("License guard error:", err);
      }
    }
  }
  // ========== FIN LICENSE GUARD ==========

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const response = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Feature flags
  const featureFlags: Record<string, string> = {
    "/dashboard": "FEATURE_DASHBOARD",
    "/inventory": "FEATURE_INVENTORY",
    // ... resto de flags ...
  };

  const flagKey = featureFlags[pathname];
  if (flagKey) {
    const envValue = process.env[`NEXT_PUBLIC_${flagKey}`];
    if (envValue === "false") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Auth check - importante: excluir /license y /api/license/
  if (!user && !isLoginPage && !isLicenseRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ... resto del proxy (role-based access, etc.) ...
  return response;
}
