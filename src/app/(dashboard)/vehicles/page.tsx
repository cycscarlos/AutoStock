"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Car, Plus, Search, X, Loader2, Edit3, Trash2, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year_start: number | null;
  year_end: number | null;
  engine: string | null;
  notes: string | null;
  created_at: string;
}

export default function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formYearStart, setFormYearStart] = useState("");
  const [formYearEnd, setFormYearEnd] = useState("");
  const [formEngine, setFormEngine] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase.from("aut_vehicles").select("*").order("brand", { ascending: true }).order("model", { ascending: true });
    if (!error && data) setItems(data as Vehicle[]);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null); setFormBrand(""); setFormModel(""); setFormYearStart(""); setFormYearEnd(""); setFormEngine(""); setFormNotes(""); setErrorMsg("");
    setIsModalOpen(true);
  }

  function openEdit(item: Vehicle) {
    setEditingId(item.id); setFormBrand(item.brand); setFormModel(item.model);
    setFormYearStart(item.year_start?.toString() || ""); setFormYearEnd(item.year_end?.toString() || "");
    setFormEngine(item.engine || ""); setFormNotes(item.notes || ""); setErrorMsg("");
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formBrand.trim() || !formModel.trim()) { setErrorMsg("Marca y modelo son obligatorios."); return; }
    setSaving(true); setErrorMsg("");

    const payload = {
      brand: formBrand.trim(), model: formModel.trim(),
      year_start: formYearStart ? parseInt(formYearStart) : null,
      year_end: formYearEnd ? parseInt(formYearEnd) : null,
      engine: formEngine.trim() || null, notes: formNotes.trim() || null,
    };

    let result;
    if (editingId) result = await supabase.from("aut_vehicles").update(payload).eq("id", editingId);
    else result = await supabase.from("aut_vehicles").insert([payload]);

    setSaving(false);
    if (result.error) {
      if (result.error.code === "23505") setErrorMsg("Ya existe ese vehículo (misma marca, modelo y motor).");
      else setErrorMsg("Error al guardar: " + result.error.message);
    } else { setIsModalOpen(false); fetchItems(); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("aut_vehicles").delete().eq("id", deleteTarget.id);
    if (error) setErrorMsg("Error al eliminar: " + error.message);
    else { setDeleteTarget(null); fetchItems(); }
  }

  const filtered = items.filter(i =>
    i.brand.toLowerCase().includes(search.toLowerCase()) ||
    i.model.toLowerCase().includes(search.toLowerCase()) ||
    (i.engine && i.engine.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">Vehículos</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Vehículos</h1>
          <p className="text-slate-500">Catálogo de vehículos compatibles con los repuestos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium cursor-pointer">
          <Plus size={18} /> Nuevo Vehículo
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por marca, modelo o motor..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <Skeleton variant="table" rows={5} cols={6} /> : filtered.length === 0 ? (
          <EmptyState title="No hay vehículos registrados" description="Agrega el primer vehículo al catálogo." action={{ label: "Nuevo Vehículo", onClick: openCreate }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-sm uppercase tracking-wider border-b border-slate-100">
                  <th className="px-3 py-3 font-semibold">Marca</th>
                  <th className="px-3 py-3 font-semibold">Modelo</th>
                  <th className="px-3 py-3 font-semibold">Años</th>
                  <th className="px-3 py-3 font-semibold">Motor</th>
                  <th className="px-3 py-3 font-semibold">Notas</th>
                  <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-900">{item.brand}</td>
                    <td className="px-3 py-3 text-slate-700">{item.model}</td>
                    <td className="px-3 py-3 text-slate-500">{item.year_start && item.year_end ? `${item.year_start}–${item.year_end}` : item.year_start || item.year_end || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{item.engine || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="px-3 py-3 text-slate-500 max-w-[150px] truncate">{item.notes || <span className="text-slate-300 italic">—</span>}</td>
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
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Car size={20} className="text-blue-600" />{editingId ? "Editar" : "Nuevo"} Vehículo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Marca *</label>
                  <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ej: Toyota" value={formBrand} onChange={e => setFormBrand(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Modelo *</label>
                  <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ej: Corolla" value={formModel} onChange={e => setFormModel(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Año Desde</label>
                  <input type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" placeholder="Ej: 2010" value={formYearStart} onChange={e => setFormYearStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Año Hasta</label>
                  <input type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" placeholder="Ej: 2015" value={formYearEnd} onChange={e => setFormYearEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Motor</label>
                <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 font-mono" placeholder="Ej: 1.8L 2ZZ-GE" value={formEngine} onChange={e => setFormEngine(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notas</label>
                <textarea className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 h-16 resize-none" placeholder="Información adicional" value={formNotes} onChange={e => setFormNotes(e.target.value)} />
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

      <ConfirmModal open={deleteTarget !== null} title="Eliminar Vehículo" message={`¿Eliminar permanentemente ${deleteTarget?.brand} ${deleteTarget?.model}?`} variant="danger" confirmLabel="Sí, eliminar" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
