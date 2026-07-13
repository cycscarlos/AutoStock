"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, Search, X, Loader2, Edit3, Trash2, Check, AlertTriangle, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Manufacturer {
  id: string;
  name: string;
  country: string | null;
  created_at: string;
}

export default function ManufacturersPage() {
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("aut_manufacturers")
      .select("*")
      .order("name", { ascending: true });
    if (!error && data) setItems(data as Manufacturer[]);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setFormName("");
    setFormCountry("");
    setErrorMsg("");
    setIsModalOpen(true);
  }

  function openEdit(item: Manufacturer) {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCountry(item.country || "");
    setErrorMsg("");
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) { setErrorMsg("El nombre del fabricante es obligatorio."); return; }
    setSaving(true);
    setErrorMsg("");

    const payload = { name: formName.trim(), country: formCountry.trim() || null };

    let result;
    if (editingId) {
      result = await supabase.from("aut_manufacturers").update(payload).eq("id", editingId);
    } else {
      result = await supabase.from("aut_manufacturers").insert([payload]);
    }

    setSaving(false);
    if (result.error) {
      if (result.error.code === "23505") setErrorMsg("Ya existe un fabricante con ese nombre.");
      else setErrorMsg("Error al guardar: " + result.error.message);
    } else {
      setIsModalOpen(false);
      fetchItems();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("aut_manufacturers").delete().eq("id", deleteTarget.id);
    if (error) setErrorMsg("Error al eliminar: " + error.message);
    else { setDeleteTarget(null); fetchItems(); }
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.country && i.country.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">Fabricantes</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Fabricantes</h1>
          <p className="text-slate-500">Catálogo de marcas y fabricantes de repuestos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium cursor-pointer">
          <Plus size={18} /> Nuevo Fabricante
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar fabricante o país..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <Skeleton variant="table" rows={5} cols={3} /> : filtered.length === 0 ? (
          <EmptyState title="No hay fabricantes registrados" description="Agrega el primer fabricante para comenzar." action={{ label: "Nuevo Fabricante", onClick: openCreate }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-sm uppercase tracking-wider border-b border-slate-100">
                  <th className="px-3 py-3 font-semibold">Fabricante</th>
                  <th className="px-3 py-3 font-semibold">País</th>
                  <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-3 py-3 text-slate-500">{item.country || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"><Edit3 size={15} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Building2 size={20} className="text-blue-600" />{editingId ? "Editar" : "Nuevo"} Fabricante</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre *</label>
                <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ej: Bosch" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">País</label>
                <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ej: Alemania" value={formCountry} onChange={e => setFormCountry(e.target.value)} />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                  {saving ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={deleteTarget !== null} title="Eliminar Fabricante" message={`¿Eliminar permanentemente a "${deleteTarget?.name}"?`} variant="danger" confirmLabel="Sí, eliminar" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
