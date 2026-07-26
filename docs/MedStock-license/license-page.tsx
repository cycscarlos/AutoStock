"use client";

import { useState, FormEvent } from "react";
import { KeyRound, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";

// NOTA PARA MEDSTOCK: Cambiar "AS" por "MS" en el badge del logo (línea 82)

export default function LicensePage() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [expired] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("expired") === "1";
  });

  function formatInput(val: string) {
    const cleaned = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const groups: string[] = [];
    for (let i = 0; i < cleaned.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) groups.push("-");
      groups.push(cleaned[i]);
    }
    return groups.join("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al activar la licencia");
      } else {
        setSuccess(true);
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-border p-8 max-w-md w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Licencia Activada</h2>
          <p className="text-slate-500">Redirigiendo al inicio de sesión...</p>
          <Loader2 className="animate-spin mx-auto text-blue-600" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #0a5c8a 1px, transparent 0)`,
            backgroundSize: "40px 40px"
          }}
        />
        <div className="absolute -top-48 -right-48 w-[32rem] h-[32rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[28rem] h-[28rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-3 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-xl shadow-primary/20 mb-3">
            {/* CAMBIAR "AS" por "MS" para MedStock */}
            <span className="text-white font-bold text-2xl">AS</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
            Activar Licencia
          </h1>
          <p className="text-slate-500">Ingrese la clave proporcionada al adquirir el sistema</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-200/60 border border-border animate-fade-in-up">
          {expired && (
            <div className="mb-5 p-3.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl border border-amber-200 flex items-center gap-2">
              <Clock size={18} className="shrink-0" />
              <span>Su licencia ha expirado. Active una nueva para continuar usando el sistema.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Clave de Licencia</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all font-mono tracking-wider text-lg"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  maxLength={19}
                  value={key}
                  onChange={(e) => setKey(formatInput(e.target.value))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || key.length < 19}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> Activando...</>
              ) : (
                "Activar Licencia"
              )}
            </button>
          </form>

          <p className="mt-5 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
            <KeyRound size={12} />
            Ingrese la clave en formato XXXX-XXXX-XXXX-XXXX
          </p>
        </div>
      </div>
    </div>
  );
}
