// AutoStock chatbot engine
// Queries the local database directly (no external AI API needed)

import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  message: string;
  data?: unknown;
}

export async function processChatMessage(
  message: string
): Promise<ChatResponse> {
  const q = message.toLowerCase();

  if (q.includes("stock bajo") || q.includes("critico")) {
    const { data: allParts } = await supabase
      .from("aut_parts")
      .select("description, stock_actual, stock_min, part_number")
      .eq("is_active", true);

    const lowStock = (allParts || [])
      .filter((p: any) => p.stock_actual <= p.stock_min)
      .slice(0, 10);

    if (lowStock.length === 0) {
      return { message: "No hay repuestos con stock crítico. ¡Todo bajo control!" };
    }
    const list = lowStock
      .map((p: any) => `• ${p.description} (${p.part_number}): ${p.stock_actual} / ${p.stock_min} mín`)
      .join("\n");
    return { message: `🔴 Repuestos con stock bajo:\n${list}`, data: lowStock };
  }

  if (q.includes("total") || q.includes("cuantos") || q.includes("inventario")) {
    const { count } = await supabase
      .from("aut_parts")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const { data: stockData } = await supabase
      .from("aut_parts")
      .select("stock_actual")
      .eq("is_active", true);
    const totalStock = (stockData || []).reduce((s: number, p: any) => s + p.stock_actual, 0);
    return {
      message: `📦 El inventario tiene **${count}** repuestos activos con **${totalStock.toLocaleString()}** unidades en total.`,
    };
  }

  if (q.includes("movimiento") || q.includes("entrada") || q.includes("salida")) {
    const { data } = await supabase
      .from("aut_movements")
      .select("type, quantity, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (!data || data.length === 0) return { message: "No hay movimientos registrados aún." };
    const lines = data
      .map((m: any) =>
        `• ${m.type === "entrada" ? "📥" : "📤"} ${m.type}: ${m.quantity} uds (${new Date(m.created_at).toLocaleDateString("es-MX")})`
      )
      .join("\n");
    return { message: `Últimos movimientos:\n${lines}` };
  }

  if (q.includes("orden") || q.includes("pendiente")) {
    const { data: pos } = await supabase
      .from("aut_purchase_orders")
      .select("status")
      .eq("status", "pendiente");
    const { data: sos } = await supabase.from("aut_sale_orders").select("status");
    const pendingSales = (sos || []).filter(
      (s: any) => s.status === "pendiente" || s.status === "confirmada"
    ).length;
    return {
      message: `📋 Órdenes pendientes: ${pos?.length || 0} compras, ${pendingSales} ventas.`,
    };
  }

  if (q.includes("ayuda") || q.includes("help") || q.includes("que puedes")) {
    return {
      message:
        `🤖 **AutoStock AI** — Puedo ayudarte con:\n\n` +
        `• "Stock bajo" — Ver repuestos con stock crítico\n` +
        `• "Total inventario" — Contar repuestos y unidades\n` +
        `• "Últimos movimientos" — Ver entradas/salidas recientes\n` +
        `• "Órdenes pendientes" — Resumen de compras y ventas\n` +
        `• "Proveedores" — Listar proveedores\n` +
        `• "Vehículos" — Contar vehículos en catálogo`,
    };
  }

  if (q.includes("proveedor")) {
    const { data } = await supabase
      .from("aut_suppliers")
      .select("name, contact_person, phone");
    if (!data || data.length === 0) return { message: "No hay proveedores registrados." };
    const lines = data
      .map((s: any) =>
        `• ${s.name}${s.contact_person ? ` (${s.contact_person})` : ""}${s.phone ? ` — ${s.phone}` : ""}`
      )
      .join("\n");
    return { message: `🏢 Proveedores:\n${lines}` };
  }

  if (q.includes("vehiculo") || q.includes("vehículo") || q.includes("auto") || q.includes("coche")) {
    const { count } = await supabase
      .from("aut_vehicles")
      .select("*", { count: "exact", head: true });
    return { message: `🚗 Hay **${count}** vehículos registrados en el catálogo.` };
  }

  return {
    message:
      "Lo siento, aún no puedo responder esa pregunta. Escribe *ayuda* para ver lo que sé hacer.",
  };
}
