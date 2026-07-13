"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Plus, Search, X, Loader2, Edit3, Trash2, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Location {
  id: string;
  code: string;
  aisle: string;
  rack: string;
  shelf: string;
  description: string | null;
  created_at: string;
}

export default function LocationsPage() {
  const [items, setItems] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formAisle, setFormAisle] = useState("");
  const [formRack, setFormRack] = useState("");
  const [formShelf, setFormShelf] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase.from("aut_locations").select("*").order("code", { ascending: true });
    if (!error && data) setItems(data as Location[]);
    setLoading(false);
  }

  function autoCode() {
    if (formAisle && formRack && formShelf) {
      setFormCode(`${formAisle.toUpperCase()}-${formRack.padStart(2, "0")}-${formShelf.padStart(2, "0")}`);
    }
  }

  function openCreate() {
    setEditingId(null);
    setFormCode(""); setFormAisle(""); setFormRack(""); setFormShelf(""); setFormDescription(""); setErrorMsg("");
    setIsModalOpen(true);
  }

  function openEdit(item: Location) {
    setEditingId(item.id);
    setFormCode(item.code); setFormAisle(item.aisle); setFormRack(item.rack); setFormShelf(item.shelf);
    setFormDescription(item.description || ""); setErrorMsg("");
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formCode.trim() || !formAisle.trim() || !formRack.trim() || !formShelf.trim()) {
      setErrorMsg("Todos los campos son obligatorios."); return;
    }
    setSaving(true); setErrorMsg("");

    const payload = { code: formCode.trim().toUpperCase(), aisle: formAisle.trim().toUpperCase(), rack: formRack.trim(), shelf: formShelf.trim(), description: formDescription.trim() || null };
    let result;
    if (editingId) result = await supabase.from("aut_locations").update(payload).eq("id", editingId);
    else result = await supabase.from("aut_locations").insert([payload]);

    setSaving(false);
    if (result.error) {
      if (result.error.code === "23505") setErrorMsg("Ya existe una ubicación con ese código.");
      else setErrorMsg("Error al guardar: " + result.error.message);
    } else { setIsModalOpen(false); fetchItems(); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("aut_locations").delete().eq("id", deleteTarget.id);
    if (error) setErrorMsg("Error al eliminar: " + error.message);
    else { setDeleteTarget(null); fetchItems(); }
  }

  const filtered = items.filter(i =>
    i.code.toLowerCase().includes(search.toLowerCase()) ||
    (i.description && i.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">Ubicaciones</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Ubicaciones en Almacén</h1>
          <p className="text-slate-500">Gestión de pasillos, racks y estantes</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium cursor-pointer">
          <Plus size={18} /> Nueva Ubicación
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por código o descripción..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <Skeleton variant="table" rows={5} cols={5} /> : filtered.length === 0 ? (
          <EmptyState title="No hay ubicaciones" description="Registra la primera ubicación del almacén." action={{ label: "Nueva Ubicación", onClick: openCreate }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-sm uppercase tracking-wider border-b border-slate-100">
                  <th className="px-3 py-3 font-semibold">Código</th>
                  <th className="px-3 py-3 font-semibold">Pasillo</th>
                  <th className="px-3 py-3 font-semibold">Rack</th>
                  <th className="px-3 py-3 font-semibold">Estante</th>
                  <th className="px-3 py-3 font-semibold">Descripción</th>
                  <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3 font-mono font-bold text-slate-700">{item.code}</td>
                    <td className="px-3 py-3 text-slate-600">{item.aisle}</td>
                    <td className="px-3 py-3 text-slate-600">{item.rack}</td>
                    <td className="px-3 py-3 text-slate-600">{item.shelf}</td>
                    <td className="px-3 py-3 text-slate-500">{item.description || <span className="text-slate-300 italic">—</span>}</td>
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
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MapPin size={20} className="text-blue-600" />{editingId ? "Editar" : "Nueva"} Ubicación</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pasillo *</label>
                  <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="A" value={formAisle} onChange={e => { setFormAisle(e.target.value); autoCode(); }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rack *</label>
                  <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="01" value={formRack} onChange={e => { setFormRack(e.target.value); autoCode(); }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estante *</label>
                  <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="03" value={formShelf} onChange={e => { setFormShelf(e.target.value); autoCode(); }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Código (auto-generado)</label>
                <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 font-mono font-bold" placeholder="A-01-03" value={formCode} onChange={e => setFormCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</label>
                <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ej: Estante de frenos y embragues" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
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

      <ConfirmModal open={deleteTarget !== null} title="Eliminar Ubicación" message={`¿Eliminar permanentemente "${deleteTarget?.code}"?`} variant="danger" confirmLabel="Sí, eliminar" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
