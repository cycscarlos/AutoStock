"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  LogOut,
  X,
  Upload,
  Loader2,
  Users,
  BarChart3,
  Car,
  Tag,
  Building2,
  MapPin,
  ShoppingCart,
  ClipboardList,
  Shield,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "vendedor", "comprador"] },
  { name: "Inventario", href: "/inventory", icon: Package, roles: ["admin", "vendedor", "comprador"] },
  { name: "Vehículos", href: "/vehicles", icon: Car, roles: ["admin", "comprador"] },
  { name: "Categorías", href: "/categories", icon: Tag, roles: ["admin"] },
  { name: "Fabricantes", href: "/manufacturers", icon: Building2, roles: ["admin", "comprador"] },
  { name: "Ubicaciones", href: "/locations", icon: MapPin, roles: ["admin"] },
  { name: "Movimientos", href: "/movements", icon: ArrowLeftRight, roles: ["admin", "vendedor"] },
  { name: "Órdenes Compra", href: "/purchase-orders", icon: ShoppingCart, roles: ["admin", "comprador"] },
  { name: "Órdenes Venta", href: "/sale-orders", icon: ClipboardList, roles: ["admin", "vendedor"] },
  { name: "Importar Datos", href: "/import", icon: Upload, roles: ["admin"] },
  { name: "Indicadores", href: "/indicators", icon: BarChart3, roles: ["admin", "vendedor", "comprador"] },
  { name: "Usuarios", href: "/users", icon: Users, roles: ["admin"] },
  ...(process.env.NODE_ENV === "development" ? [{ name: "Licencias", href: "/admin/licenses", icon: Shield, roles: ["admin"] }] : []),
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const visibleItems = navItems.filter((item) => {
    const flagKey = item.href === "/dashboard" ? "FEATURE_DASHBOARD"
      : item.href === "/inventory" ? "FEATURE_INVENTORY"
      : item.href === "/vehicles" ? "FEATURE_VEHICLES"
      : item.href === "/categories" ? "FEATURE_CATEGORIES"
      : item.href === "/manufacturers" ? "FEATURE_MANUFACTURERS"
      : item.href === "/locations" ? "FEATURE_LOCATIONS"
      : item.href === "/movements" ? "FEATURE_MOVEMENTS"
      : item.href === "/purchase-orders" ? "FEATURE_PURCHASE_ORDERS"
      : item.href === "/sale-orders" ? "FEATURE_SALE_ORDERS"
      : item.href === "/import" ? "FEATURE_IMPORT"
      : item.href === "/users" ? "FEATURE_USERS"
      : item.href === "/indicators" ? "FEATURE_INDICATORS"
      : null;
    const enabled = !flagKey || process.env[`NEXT_PUBLIC_${flagKey}`] !== "false";
    return item.roles.includes(role ?? "vendedor") && enabled;
  });

  async function handleSignOut() {
    setIsSigningOut(true);
    setShowSignOutConfirm(false);
    try {
      await supabase.auth.signOut();
    } catch {
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 flex flex-col border-r border-slate-700/50 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-lg">AS</span>
            </div>
            <span className="font-display text-white text-xl font-bold tracking-tight">AutoStock</span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
            title="Cerrar menú"
            className="lg:hidden p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative overflow-hidden group",
                pathname === item.href
                  ? "bg-slate-700/60 text-white font-medium"
                  : "text-slate-400 hover:bg-slate-700/30 hover:text-white"
              )}
            >
              <div className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full transition-all duration-200",
                pathname === item.href
                  ? "bg-primary opacity-100"
                  : "bg-primary/50 opacity-0 group-hover:opacity-60"
              )} />

              <item.icon size={19} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700/50">
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            disabled={isSigningOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSigningOut ? (
              <Loader2 size={19} className="animate-spin shrink-0" />
            ) : (
              <LogOut size={19} className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            )}
            <span>{isSigningOut ? "Cerrando sesión..." : "Cerrar Sesión"}</span>
          </button>
        </div>
      </aside>

      <ConfirmModal
        open={showSignOutConfirm}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir?"
        variant="danger"
        confirmLabel={isSigningOut ? "Cerrando..." : "Sí, cerrar sesión"}
        loading={isSigningOut}
        onConfirm={handleSignOut}
        onClose={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}
