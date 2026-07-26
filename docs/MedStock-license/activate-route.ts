import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyLicenseKey } from "@/lib/license";

const LICENSE_SECRET = process.env.LICENSE_SECRET || "dev_license_secret_insecure";

export async function POST(request: NextRequest) {
  try {
    const { license_key } = await request.json();
    if (!license_key) {
      return NextResponse.json({ error: "Ingrese una clave de licencia" }, { status: 400 });
    }

    if (!verifyLicenseKey(license_key, LICENSE_SECRET)) {
      return NextResponse.json({ error: "Clave de licencia inválida" }, { status: 400 });
    }

    const { error: deactivateError } = await supabaseAdmin
      .from("aut_licenses")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: insertError } = await supabaseAdmin
      .from("aut_licenses")
      .insert({
        license_key,
        activated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString().split("T")[0],
        is_active: true,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Esta clave ya fue activada anteriormente" }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
