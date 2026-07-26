import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*license.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  const isLoginPage = pathname === "/login";

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

  if (!user && !isLoginPage) {
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
