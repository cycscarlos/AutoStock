import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDev = process.env.NODE_ENV !== "production";
  const licenseDisabled = process.env.LICENSE_DISABLED === "true";
  const forceLicense = process.env.FORCE_LICENSE === "true";
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");
  const isLicenseRoute = pathname.startsWith("/license") || pathname.startsWith("/api/license/");

  if (!licenseDisabled && !(isDev && !forceLicense) && !isLicenseRoute && !isLoginPage) {
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
        console.log("License guard: license expired, redirecting");
        return NextResponse.redirect(new URL("/license?expired=1", request.url));
      }

      console.log("License guard: OK, days left:", daysLeft);
    } catch (err) {
      console.error("License guard error:", err);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const response = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const featureFlags: Record<string, string> = {
    "/dashboard": "FEATURE_DASHBOARD",
    "/inventory": "FEATURE_INVENTORY",
    "/vehicles": "FEATURE_VEHICLES",
    "/categories": "FEATURE_CATEGORIES",
    "/manufacturers": "FEATURE_MANUFACTURERS",
    "/locations": "FEATURE_LOCATIONS",
    "/movements": "FEATURE_MOVEMENTS",
    "/purchase-orders": "FEATURE_PURCHASE_ORDERS",
    "/sale-orders": "FEATURE_SALE_ORDERS",
    "/import": "FEATURE_IMPORT",
    "/users": "FEATURE_USERS",
    "/indicators": "FEATURE_INDICATORS",
  };

  const flagKey = featureFlags[pathname];
  if (flagKey) {
    const envValue = process.env[`NEXT_PUBLIC_${flagKey}`];
    if (envValue === "false") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (!user && !isLoginPage && !isLicenseRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && !isLoginPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile?.role ?? "vendedor";

    const access: Record<string, string[]> = {
      "/users": ["admin"],
      "/import": ["admin"],
      "/categories": ["admin"],
      "/locations": ["admin"],
      "/vehicles": ["admin", "comprador"],
      "/manufacturers": ["admin", "comprador"],
      "/purchase-orders": ["admin", "comprador"],
      "/sale-orders": ["admin", "vendedor"],
      "/movements": ["admin", "vendedor"],
      "/indicators": ["admin", "vendedor", "comprador"],
    };

    const requiredRoles = access[pathname];
    if (requiredRoles && !requiredRoles.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}
