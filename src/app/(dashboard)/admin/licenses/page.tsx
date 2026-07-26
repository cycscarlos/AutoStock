"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Shield, KeyRound, Calendar, Clock, CheckCircle, AlertCircle, Loader2, Copy } from "lucide-react";

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function AdminLicensesPage() {
  const { user, role } = useAuth();
  const [licencia, setLicencia] = useState<{
    license_key: string;
    activated_at: string;
    expires_at: string;
    days_left: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activateDate, setActivateDate] = useState(toDateInputValue(new Date()));
  const [expireDate, setExpireDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateInputValue(d);
  });
  const [newKey, setNewKey] = useState<string | null>(null);

  async function loadLicense() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("aut_licenses")
      .select("license_key, activated_at, expires_at")
      .eq("is_active", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (err) {
      setError(err.message);
    } else if (data) {
      const diff = new Date(data.expires_at).getTime() - Date.now();
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setLicencia({ ...data, days_left: Math.max(0, daysLeft) });
      setActivateDate(toDateInputValue(new Date(data.activated_at)));
      setExpireDate(data.expires_at);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!user || role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLicense();
  }, [user, role]);

  async function handleGenerate() {
    setError("");
    setNewKey(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/licenses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activated_at: activateDate,
          expires_at: expireDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setNewKey(data.license_key);
    } catch {
      setError("Error al generar licencia");
    } finally {
      setGenerating(false);
    }
  }

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <AlertCircle size={20} className="mr-2" /> Solo administradores
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display flex items-center gap-3">
            <Shield size={28} className="text-blue-600" /> Licencias
          </h1>
          <p className="text-slate-500 mt-1">Gestión de licencias del sistema</p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : licencia ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound size={12} /> Clave
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-900">{licencia.license_key}</span>
                  <button onClick={() => navigator.clipboard.writeText(licencia.license_key)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> Días restantes
                </span>
                <span className={`text-sm font-semibold ${licencia.days_left <= 7 ? "text-red-600" : licencia.days_left <= 30 ? "text-amber-600" : "text-green-600"}`}>
                  {licencia.days_left}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={16} /> Licencia activa (sesión actual)
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <KeyRound size={32} className="mx-auto mb-2 opacity-50" />
            <p>No hay licencia activa</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900 font-display">Generar Nueva Licencia</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} /> Activación
            </label>
            <input
              type="date"
              value={activateDate}
              onChange={(e) => setActivateDate(e.target.value)}
              className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} /> Expiración
            </label>
            <input
              type="date"
              value={expireDate}
              onChange={(e) => setExpireDate(e.target.value)}
              className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-sm"
            />
          </div>
        </div>

        {newKey && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <KeyRound size={16} />
              <span className="font-semibold">Nueva licencia generada (para próxima sesión)</span>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
              <span className="font-mono text-sm text-slate-900 font-bold tracking-wider">{newKey}</span>
              <button onClick={() => navigator.clipboard.writeText(newKey)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <Copy size={16} />
              </button>
            </div>
            <p className="text-xs text-amber-600">
              Esta licencia reemplazará a la actual. Úsala la próxima vez que actives el sistema.
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || !activateDate || !expireDate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {generating ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
          Generar Nueva Licencia
        </button>
      </div>
    </div>
  );
}
