"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Package,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShoppingCart,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import BarChart from "@/components/ui/BarChart";

interface Part {
  id: string;
  part_number: string;
  description: string;
  stock_actual: number;
  stock_min: number;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState({
    totalParts: 0,
    totalStock: 0,
    criticalAlerts: 0,
    activeOrders: 0,
  });
  const [criticalItems, setCriticalItems] = useState<Part[]>([]);
  const [slowMovingItems, setSlowMovingItems] = useState<Part[]>([]);
  const [movementsData, setMovementsData] = useState<{ label: string, value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: partsData } = await supabase.from("aut_parts").select("*");
        const parts = partsData || [];

        const totalParts = parts.length;
        const totalStock = parts.reduce((acc, s) => acc + s.stock_actual, 0);
        const criticals = parts.filter(s => s.stock_actual <= s.stock_min);

        setKpis({ totalParts, totalStock, criticalAlerts: criticals.length, activeOrders: 0 });
        setCriticalItems(criticals);

        const slowMoving = parts.filter(s => s.stock_actual > s.stock_min * 3).slice(0, 5);
        setSlowMovingItems(slowMoving);

        const { count: purchaseCount } = await supabase
          .from("aut_purchase_orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pendiente", "enviada"]);

        const { count: saleCount } = await supabase
          .from("aut_sale_orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pendiente", "reservado", "despachado"]);

        setKpis(prev => ({ ...prev, activeOrders: (purchaseCount || 0) + (saleCount || 0) }));

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: recentMovements } = await supabase
          .from("aut_movements")
          .select("created_at")
          .gte("created_at", sevenDaysAgo.toISOString());

        const dayCount = Array(7).fill(0);
        if (recentMovements) {
          for (const m of recentMovements) {
            const d = new Date(m.created_at);
            dayCount[d.getDay()]++;
          }
        }

        const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
        setMovementsData(labels.map((l, i) => ({ label: l, value: dayCount[(i + 1) % 7] })));
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div>
          <div className="h-8 w-64 bg-muted rounded-lg animate-shimmer" />
          <div className="h-4 w-48 bg-muted rounded-lg mt-2 animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-border animate-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-white rounded-2xl border border-border animate-shimmer" />
          <div className="h-64 bg-white rounded-2xl border border-border animate-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Dashboard de Operaciones</h1>
        <p className="text-slate-500 mt-1">Vista general del estado actual del almacén</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-in-up">
          <TooltipWrapper tip="Cantidad total de repuestos registrados en el sistema">
            <KPICard
              title="Total Repuestos"
              value={kpis.totalParts}
              icon={<Package size={18} />}
              trend="Catálogo completo"
              trendUp={false}
            />
          </TooltipWrapper>
        </div>
        <div className="animate-fade-in-up stagger-1">
          <TooltipWrapper tip="Suma total del stock físico disponible en almacén">
            <KPICard
              title="Stock Físico"
              value={kpis.totalStock}
              icon={<TrendingUp size={18} />}
              trend="Unidades en existencia"
              trendUp={false}
            />
          </TooltipWrapper>
        </div>
        <div className="animate-fade-in-up stagger-2">
          <TooltipWrapper tip="Órdenes de compra y venta activas">
            <KPICard
              title="Órdenes Activas"
              value={kpis.activeOrders}
              icon={<ClipboardList size={18} />}
              trend="Pendientes de gestión"
              trendUp={false}
            />
          </TooltipWrapper>
        </div>
        <div className="animate-fade-in-up stagger-3">
          <TooltipWrapper tip="Repuestos cuyo stock actual es igual o inferior al stock mínimo">
            <KPICard
              title="Alertas Críticas"
              value={kpis.criticalAlerts}
              icon={<AlertCircle size={18} />}
              trend="Requiere reabastecimiento"
              trendUp={false}
              isAlert={true}
            />
          </TooltipWrapper>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 animate-fade-in-up stagger-4">
          <TooltipWrapper tip="Movimientos registrados en los últimos 7 días">
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  Movimientos Recientes
                </h3>
                <span className="text-xs text-slate-400 font-medium bg-muted px-2.5 py-1 rounded-full">7 días</span>
              </div>
              <div className="flex justify-center py-2">
                <BarChart data={movementsData} loaded={!loading} />
              </div>
            </div>
          </TooltipWrapper>
        </div>

        <div className="animate-fade-in-up stagger-4">
          <TooltipWrapper tip="Repuestos con bajo stock crítico y artículos de baja rotación">
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                Alertas de Stock
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Críticos
                  </p>
                  <div className="space-y-1.5">
                    {criticalItems.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Sin alertas críticas</p>
                    ) : (
                      criticalItems.slice(0, 4).map(item => (
                        <div key={item.id} className="p-3 rounded-xl bg-red-50 border border-red-100 flex justify-between items-center group hover:bg-red-100/80 transition-colors">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-bold text-red-700">{item.part_number}</span>
                            <span className="text-[11px] text-red-500 truncate">{item.description}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-red-700">{item.stock_actual} / {item.stock_min}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          </div>
                        </div>
                      ))
                    )}
                    {criticalItems.length > 4 && (
                      <p className="text-xs text-slate-400 font-medium text-center pt-1">+{criticalItems.length - 4} más</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Baja Rotación
                  </p>
                  <div className="space-y-1.5">
                    {slowMovingItems.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Sin artículos lentos</p>
                    ) : (
                      slowMovingItems.slice(0, 3).map(item => (
                        <div key={item.id} className="p-3 rounded-xl bg-muted border border-border flex justify-between items-center group hover:bg-slate-100 transition-colors">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-bold text-slate-600">{item.part_number}</span>
                            <span className="text-[11px] text-slate-400 truncate">{item.description}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-400 shrink-0">{item.stock_actual} un.</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TooltipWrapper>
        </div>
      </div>
    </div>
  );
}

function TooltipWrapper({ children, tip, className = "" }: { children: React.ReactNode; tip: string; className?: string }) {
  return (
    <div className={"relative group" + (className ? " " + className : "")}>
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
        bg-slate-900 text-slate-300 text-[11px] font-medium leading-tight
        rounded-lg shadow-lg shadow-black/10
        opacity-0 group-hover:opacity-100
        translate-y-1 group-hover:translate-y-0
        scale-95 group-hover:scale-100
        transition-all duration-200 ease-out
        pointer-events-none z-50 whitespace-nowrap">
        {tip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

const cardColors: Record<string, { border: string; iconBg: string; icon: string; value: string; trend: string }> = {
  default: {
    border: "border-l-primary",
    iconBg: "bg-primary-light",
    icon: "text-primary",
    value: "text-slate-900",
    trend: "text-green-600",
  },
  alert: {
    border: "border-l-red-500",
    iconBg: "bg-red-50",
    icon: "text-red-600",
    value: "text-red-700",
    trend: "text-red-500",
  },
};

function KPICard({ title, value, icon, trend, trendUp, isAlert = false }: { title: string, value: string | number, icon: React.ReactNode, trend: string, trendUp: boolean, isAlert?: boolean }) {
  const c = isAlert ? cardColors.alert : cardColors.default;
  return (
    <div className={cn(
      "bg-white p-5 rounded-2xl border border-border shadow-sm transition-all hover:shadow-md border-l-[3px]",
      c.border
    )}>
      <div className="flex justify-between items-start">
        <div className={cn("p-2.5 rounded-xl", c.iconBg)}>
          <div className={c.icon}>{icon}</div>
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-bold mt-1", trendUp ? c.trend : "text-slate-400")}>
          {trendUp ? <ArrowUpRight size={13} /> : null}
          {trend}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-0.5">
        <span className="text-slate-500 text-xs font-medium">{title}</span>
        <span className={cn("text-3xl font-bold tracking-tight font-display", c.value)}>
          {value}
        </span>
      </div>
    </div>
  );
}
