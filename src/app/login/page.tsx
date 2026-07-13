"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Mail, Loader2, Eye, EyeOff } from "lucide-react";

function translateError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Credenciales inválidas";
  if (message.includes("Email not confirmed")) return "Correo electrónico no confirmado";
  if (message.includes("rate limit")) return "Demasiados intentos. Espere un momento.";
  return "Error de conexión. Intente nuevamente.";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [redirectTo] = useState(() => {
    if (typeof window === "undefined") return "/dashboard";
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    return (redirect && !redirect.startsWith("/login")) ? redirect : "/dashboard";
  });

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (user) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(translateError(error.message));
      } else {
        router.push(redirectTo);
      }
    } catch {
      setErrorMsg("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
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
        <div className="absolute top-1/4 right-1/3 w-3 h-3 rounded-full bg-primary/10" />
        <div className="absolute bottom-1/3 left-1/4 w-4 h-4 rounded-full bg-primary/8" />
        <div className="absolute top-2/3 left-1/2 w-2 h-2 rounded-full bg-primary/6" />
      </div>

      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-3 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-xl shadow-primary/20 mb-3 animate-scale-in">
            <span className="text-white font-bold text-2xl">AS</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
            AutoStock
          </h1>
          <p className="text-slate-500">Acceso al sistema de gestión de repuestos</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-200/60 border border-border stagger-1 animate-fade-in-up">
          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2 animate-fade-in-up">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  placeholder="usuario@autostock.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className="w-full pl-11 pr-11 py-3 bg-white text-slate-900 placeholder:text-slate-400 border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> Ingresando...</>
              ) : (
                "Entrar al Sistema"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
