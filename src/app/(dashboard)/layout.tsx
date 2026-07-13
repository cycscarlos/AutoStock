"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import AutoStockChat from "@/components/AutoStockChat";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <span className="text-[10px] font-bold">AS</span>
            </div>
            <span className="font-display font-bold text-slate-900 text-base tracking-tight">AutoStock</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-muted transition-colors"
          >
            <Menu size={22} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>

      <AutoStockChat />
    </div>
  );
}
