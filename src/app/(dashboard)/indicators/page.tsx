"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, ShoppingCart, ClipboardList, Home } from "lucide-react";
import Link from "next/link";
import Skeleton from "@/components/ui/Skeleton";
import BarChart from "@/components/ui/BarChart";

interface IndicatorCard { title: string; value: string; subtitle?: string; icon: any; color: string; trend?: "up" | "down" | "neutral"; }

export default function IndicatorsPage() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<IndicatorCard[]>([]);
  const [movementData, setMovementData] = useState<{ label: string; value: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ label: string; value: number }[]>([]);
  const [topParts, setTopParts] = useState<{ label: string; value: number }[]>([]);
  const [cat, setCat] = useState("all");
  const [range, setRange] = useState("30");

  useEffect(() => { fetchAll(); }, [cat, range]);

  async function fetchAll() {
    setLoading(true);
    const days = parseInt(range);

    const [partsRes, movRes, poRes, soRes] = await Promise.all([
      supabase.from("aut_parts").select("id,stock_actual,stock_min,description", { count: "exact" }).eq("is_active", true),
      supabase.from("aut_movements").select("type,quantity,created_at,part:aut_parts!part_id(description)").gte("created_at", new Date(Date.now() - days * 86400000).toISOString()),
      supabase.from("aut_purchase_orders").select("id").eq("status", "pendiente"),
      supabase.from("aut_sale_orders").select("id,type,items:aut_sale_items(quantity,unit_price)").gte("created_at", new Date(Date.now() - days * 86400000).toISOString()),
    ]);

    const parts = partsRes.data || [];
    const movements = movRes.data || [];
    const pendingPO = poRes.data?.length || 0;

    const totalParts = partsRes.count || 0;
    const totalStock = parts.reduce((sum, p: any) => sum + p.stock_actual, 0);
    const lowStock = parts.filter((p: any) => p.stock_actual <= p.stock_min).length;

    const entradas = movements.filter((m: any) => m.type === "entrada").reduce((s: number, m: any) => s + m.quantity, 0);
    const salidas = movements.filter((m: any) => m.type === "salida").reduce((s: number, m: any) => s + m.quantity, 0);

    const salesOrders = soRes.data || [];
    const totalSales = salesOrders.filter((o: any) => o.type === "directa").length;
    const reserveOrders = salesOrders.filter((o: any) => o.type === "reserva").length;
    const salesRevenue = salesOrders.reduce((sum: number, o: any) => sum + (o.items || []).reduce((s: number, i: any) => s + (i.unit_price || 0) * i.quantity, 0), 0);

    setCards([
      { title: "Repuestos Activos", value: totalParts.toLocaleString(), subtitle: `${totalStock.toLocaleString()} unidades en stock`, icon: Package, color: "blue" },
      { title: "Stock Bajo Crítico", value: lowStock.toString(), subtitle: `${totalParts > 0 ? ((lowStock / totalParts) * 100).toFixed(1) : 0}% del inventario`, icon: AlertTriangle, color: "red", trend: lowStock > 0 ? "down" : "neutral" },
      { title: "Movimientos (${range}d)", value: (entradas + salidas).toLocaleString(), subtitle: `${entradas} entradas · ${salidas} salidas`, icon: TrendingUp, color: "green" },
      { title: "Órdenes Pendientes", value: (pendingPO + salesOrders.filter((o: any) => o.status === "pendiente").length).toString(), subtitle: `${pendingPO} compras · ${salesOrders.filter((o: any) => o.status === "pendiente").length} ventas`, icon: ClipboardList, color: "amber" },
      { title: "Ventas (${range}d)", value: totalSales.toString(), subtitle: `${reserveOrders} reservas · $${salesRevenue.toFixed(2)} ingresos`, icon: DollarSign, color: "green", trend: "up" },
      { title: "Rotación Stock", value: totalStock > 0 ? ((entradas + salidas) / totalStock).toFixed(2) : "0", subtitle: "movimientos por unidad", icon: BarChart3, color: "purple" },
    ]);

    // Movements by day
    const movByDay: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      movByDay[d] = 0;
    }
    movements.forEach((m: any) => {
      const d = m.created_at.slice(0, 10);
      if (movByDay[d] !== undefined) movByDay[d] += m.quantity;
    });
    setMovementData(Object.entries(movByDay).map(([label, value]) => ({ label: label.slice(5), value })));

    // Stock by category
    if (cat === "all" || cat === "category") {
      const { data: catParts } = await supabase.from("aut_parts").select("stock_actual, category:aut_categories!category_id(name)").eq("is_active", true);
      if (catParts) {
        const byCat: Record<string, number> = {};
        catParts.forEach((p: any) => { const n = p.category?.name || "Sin categoría"; byCat[n] = (byCat[n] || 0) + p.stock_actual; });
        setCategoryData(Object.entries(byCat).map(([label, value]) => ({ label, value })));
      }
    }

    // Top parts by stock
    const topByStock = parts.sort((a: any, b: any) => b.stock_actual - a.stock_actual).slice(0, 10);
    setTopParts(topByStock.map((p: any) => ({ label: p.description, value: p.stock_actual })));

    setLoading(false);
  }

  const colorMap: Record<string, string> = { blue: "border-l-blue-500 bg-blue-50/30", red: "border-l-red-500 bg-red-50/30", green: "border-l-green-500 bg-green-50/30", amber: "border-l-amber-500 bg-amber-50/30", purple: "border-l-purple-500 bg-purple-50/30" };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span> <span className="text-slate-600 font-medium">Indicadores</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Indicadores</h1>
          <p className="text-slate-500">Análisis y métricas del inventario</p>
        </div>
        <div className="flex gap-3">
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" value={range} onChange={e => setRange(e.target.value)}>
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
            <option value="365">1 año</option>
          </select>
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" value={cat} onChange={e => setCat(e.target.value)}>
            <option value="all">General</option>
            <option value="category">Por Categoría</option>
          </select>
        </div>
      </div>

      {loading ? <Skeleton variant="card" rows={6} /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <div key={i} className={`bg-white rounded-xl border border-slate-100 shadow-sm border-l-4 ${colorMap[c.color] || "border-l-slate-300"} p-5`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{c.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 font-display">{c.value}</p>
                  {c.subtitle && <p className="text-xs text-slate-500 mt-1">{c.subtitle}</p>}
                </div>
                <c.icon size={22} className={`text-${c.color}-500 opacity-60`} />
              </div>
              {c.trend && (
                <div className="mt-3 flex items-center gap-1 text-xs">
                  {c.trend === "up" ? <TrendingUp size={12} className="text-green-500" /> : c.trend === "down" ? <TrendingDown size={12} className="text-red-500" /> : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Movimientos por Día</h3>
          {movementData.length > 0 ? <BarChart data={movementData} loaded={true} /> : <p className="text-sm text-slate-400 text-center py-6">Sin datos en el período</p>}
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top 10 Repuestos por Stock</h3>
          {topParts.length > 0 ? <BarChart data={topParts} loaded={true} /> : <p className="text-sm text-slate-400 text-center py-6">Sin datos</p>}
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Stock por Categoría</h3>
          <BarChart data={categoryData} loaded={true} />
        </div>
      )}
    </div>
  );
}
