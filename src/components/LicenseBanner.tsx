"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, X } from "lucide-react";

export default function LicenseBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    supabase
      .from("aut_licenses")
      .select("expires_at")
      .eq("is_active", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.expires_at) return;
        const expiresAt = new Date(data.expires_at + "T23:59:59Z");
        const diff = expiresAt.getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 30 && days >= 0) setDaysLeft(days);
      });
  }, []);

  if (daysLeft === null || dismissed) return null;

  return (
    <div className="mx-4 md:mx-8 mt-4 md:mt-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-amber-700">
        <Clock size={16} />
        <span>
          Su licencia expira en <strong>{daysLeft}</strong> día{daysLeft !== 1 ? "s" : ""}.
          {daysLeft <= 7 ? " ¡Renueve pronto!" : ""}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 transition-colors cursor-pointer shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
