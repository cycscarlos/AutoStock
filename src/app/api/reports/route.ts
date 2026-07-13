import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { email, type } = await request.json();

    const host = process.env.SMTP_HOST;
    const pass = process.env.SMTP_PASS;

    if (!host || !pass) {
      return NextResponse.json(
        { error: "SMTP no configurado. Configura SMTP_HOST y SMTP_PASS en .env.local" },
        { status: 501 }
      );
    }

    // Gather report data
    const [partsCount, poCount, soCount, lowStock] = await Promise.all([
      supabase.from("aut_parts").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("aut_purchase_orders").select("id").eq("status", "pendiente"),
      supabase.from("aut_sale_orders").select("id"),
      supabase.from("aut_parts").select("description, part_number, stock_actual, stock_min").eq("is_active", true),
    ]);

    const lowStockItems = (lowStock.data || []).filter((p: any) => p.stock_actual <= p.stock_min);

    let html = `
      <h2>📊 Reporte AutoStock</h2>
      <p><strong>Repuestos activos:</strong> ${partsCount.count || 0}</p>
      <p><strong>Órdenes de compra pendientes:</strong> ${poCount.data?.length || 0}</p>
      <p><strong>Órdenes de venta:</strong> ${soCount.data?.length || 0}</p>
      <hr/>
    `;

    if (type === "low-stock" && lowStockItems.length > 0) {
      html += `<h3>🔴 Repuestos con stock bajo</h3><ul>`;
      lowStockItems.slice(0, 20).forEach((p: any) => {
        html += `<li>${p.description} (${p.part_number}): ${p.stock_actual} / ${p.stock_min}</li>`;
      });
      html += `</ul>`;
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email || process.env.SMTP_FROM,
      subject: `Reporte AutoStock — ${type === "low-stock" ? "Stock Bajo" : "General"}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
