import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SECRET = process.env.LICENSE_SECRET || "dev_license_secret_insecure";

function generateKey(expiresAt: Date) {
  const yy = String(expiresAt.getUTCFullYear()).slice(2);
  const mm = String(expiresAt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(expiresAt.getUTCDate()).padStart(2, "0");
  const rawDate = yy + mm + dd;

  const hmac = createHmac("sha256", SECRET)
    .update(rawDate)
    .digest("hex")
    .substring(0, 10)
    .toUpperCase();

  const full = rawDate + hmac;
  const groups: string[] = [];
  for (let i = 0; i < full.length; i += 4) {
    groups.push(full.substring(i, i + 4));
  }

  return { key: groups.join("-"), expires_at: expiresAt.toISOString().split("T")[0] };
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 404 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { activated_at, expires_at } = await request.json();

    if (!activated_at || !expires_at) {
      return NextResponse.json({ error: "Fechas de activación y expiración requeridas" }, { status: 400 });
    }

    const expiresDate = new Date(expires_at + "T00:00:00Z");
    if (isNaN(expiresDate.getTime())) {
      return NextResponse.json({ error: "Fecha de expiración inválida" }, { status: 400 });
    }

    if (expiresDate <= new Date()) {
      return NextResponse.json({ error: "La fecha de expiración debe ser futura" }, { status: 400 });
    }

    const { key } = generateKey(expiresDate);

    const { error: deleteError } = await supabaseAdmin
      .from("aut_licenses")
      .delete()
      .eq("license_key", key);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error: insertError } = await supabaseAdmin
      .from("aut_licenses")
      .insert({
        license_key: key,
        activated_at,
        expires_at,
        is_active: false,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, license_key: key, expires_at });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
