"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, X, Loader2, Shield, Home, Mail } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/components/AuthProvider";

interface UserProfile {
  id: string; email: string | null; role: string; created_at: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  comprador: "Comprador",
};

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  vendedor: "bg-blue-100 text-blue-700",
  comprador: "bg-green-100 text-green-700",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Role change modal
  const [roleTarget, setRoleTarget] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching users:", error);
    else setUsers(data as UserProfile[] || []);
    setLoading(false);
  }

  function openRoleChange(user: UserProfile) {
    setRoleTarget(user);
    setNewRole(user.role);
    setErrorMsg("");
  }

  async function handleRoleChange() {
    if (!roleTarget || !newRole || newRole === roleTarget.role) {
      setRoleTarget(null);
      return;
    }
    setSaving(true);
    setErrorMsg("");

    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: roleTarget.id, role: newRole }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setErrorMsg(data.error || "Error al actualizar rol");
      return;
    }

    setRoleTarget(null);
    fetchUsers();
  }

  const filtered = users.filter(u =>
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    roleLabels[u.role]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span> <span className="text-slate-600 font-medium">Usuarios</span>
      </nav>

      <div>
        <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Usuarios</h1>
        <p className="text-slate-500">{users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por email o rol..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <Skeleton variant="table" rows={4} cols={4} /> : filtered.length === 0 ? (
          <EmptyState title={search ? "Sin resultados" : "Sin usuarios"} description={search ? "Intenta con otros términos." : "No hay usuarios registrados."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-3 py-3 font-semibold">Correo Electrónico</th>
                  <th className="px-3 py-3 font-semibold">Rol</th>
                  <th className="px-3 py-3 font-semibold">Registrado</th>
                  <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-slate-900 font-medium">{u.email || "Sin email"}</span>
                        {u.id === currentUser?.id && <span className="text-[10px] text-blue-500 font-medium">(tú)</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${roleColors[u.role] || "bg-slate-100 text-slate-600"}`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString("es-MX")}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => openRoleChange(u)}
                        disabled={u.id === currentUser?.id}
                        className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Cambiar rol"
                      >
                        <Shield size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {roleTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setRoleTarget(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Shield size={20} className="text-blue-600" /> Cambiar Rol</h3>
              <button onClick={() => setRoleTarget(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}
              <p className="text-sm text-slate-600">Usuario: <span className="font-semibold text-slate-900">{roleTarget.email}</span></p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nuevo Rol</label>
                <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="admin">Administrador</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="comprador">Comprador</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button onClick={() => setRoleTarget(null)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer">Cancelar</button>
                <button onClick={handleRoleChange} disabled={saving || newRole === roleTarget.role} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                  {saving ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
