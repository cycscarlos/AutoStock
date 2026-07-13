"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Plus, Search, X, Loader2, Edit3, Trash2, Home, Download } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Part {
  id: string;
  part_number: string;
  oem_number: string | null;
  description: string;
  manufacturer_id: string | null;
  category_id: string | null;
  location_id: string | null;
  supplier_id: string | null;
  stock_actual: number;
  stock_min: number;
  stock_max: number;
  unit_type: string;
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  lot_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  barcode: string | null;
  is_active: boolean;
  created_at: string;
}

interface Lookup {
  id: string; name?: string; code?: string; brand?: string; model?: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manufacturers, setManufacturers] = useState<Lookup[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [locations, setLocations] = useState<Lookup[]>([]);
  const [suppliers, setSuppliers] = useState<Lookup[]>([]);
  const [vehicles, setVehicles] = useState<Lookup[]>([]);

  useEffect(() => { fetchItems(); fetchLookups(); }, []);

  async function fetchLookups() {
    const [m, c, l, s, v] = await Promise.all([
      supabase.from("aut_manufacturers").select("id,name").order("name"),
      supabase.from("aut_categories").select("id,name").order("name"),
      supabase.from("aut_locations").select("id,code").order("code"),
      supabase.from("aut_suppliers").select("id,name").order("name"),
      supabase.from("aut_vehicles").select("id,brand,model").order("brand"),
    ]);
    if (!m.error) setManufacturers(m.data as Lookup[]);
    if (!c.error) setCategories(c.data as Lookup[]);
    if (!l.error) setLocations(l.data as Lookup[]);
    if (!s.error) setSuppliers(s.data as Lookup[]);
    if (!v.error) setVehicles(v.data as Lookup[]);
  }

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("aut_parts")
      .select("*, manufacturer:aut_manufacturers!manufacturer_id(name), category:aut_categories!category_id(name), location:aut_locations!location_id(code), supplier:aut_suppliers!supplier_id(name)")
      .eq("is_active", true)
      .order("description", { ascending: true });
    if (!error && data) {
      const ids = data.map(p => p.id);
      const { data: compat } = ids.length ? await supabase.from("aut_part_vehicles").select("part_id, vehicle:aut_vehicles!vehicle_id(brand,model)").in("part_id", ids) : { data: [] };
      const compatMap: Record<string, string[]> = {};
      (compat || []).forEach((c: any) => {
        if (!compatMap[c.part_id]) compatMap[c.part_id] = [];
        if (c.vehicle) compatMap[c.part_id].push(`${c.vehicle.brand} ${c.vehicle.model}`);
      });
      setItems(data.map(p => ({ ...p, vehicles: compatMap[p.id] || [] })));
    }
    setLoading(false);
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    part_number: "", oem_number: "", description: "", manufacturer_id: "", category_id: "",
    location_id: "", supplier_id: "", stock_actual: 0, stock_min: 5, stock_max: 50, unit_type: "Unidad",
    weight_kg: 0, length_cm: 0, width_cm: 0, height_cm: 0, lot_number: "", expiry_date: "", notes: "", barcode: ""
  });
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ part_number: "", oem_number: "", description: "", manufacturer_id: "", category_id: "", location_id: "", supplier_id: "", stock_actual: 0, stock_min: 5, stock_max: 50, unit_type: "Unidad", weight_kg: 0, length_cm: 0, width_cm: 0, height_cm: 0, lot_number: "", expiry_date: "", notes: "", barcode: "" });
    setSelectedVehicles([]); setErrorMsg(""); setIsModalOpen(true);
  }

  async function openEdit(item: any) {
    setEditingId(item.id);
    setForm({
      part_number: item.part_number, oem_number: item.oem_number || "", description: item.description,
      manufacturer_id: item.manufacturer_id || "", category_id: item.category_id || "",
      location_id: item.location_id || "", supplier_id: item.supplier_id || "",
      stock_actual: item.stock_actual, stock_min: item.stock_min, stock_max: item.stock_max,
      unit_type: item.unit_type, weight_kg: item.weight_kg || 0, length_cm: item.length_cm || 0,
      width_cm: item.width_cm || 0, height_cm: item.height_cm || 0,
      lot_number: item.lot_number || "", expiry_date: item.expiry_date || "", notes: item.notes || "", barcode: item.barcode || ""
    });
    setErrorMsg("");
    const { data: compat } = await supabase.from("aut_part_vehicles").select("vehicle_id").eq("part_id", item.id);
    setSelectedVehicles((compat || []).map((c: any) => c.vehicle_id));
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.part_number.trim() || !form.description.trim()) { setErrorMsg("Código y descripción son obligatorios."); return; }
    setSaving(true); setErrorMsg("");

    const payload: any = {
      part_number: form.part_number.trim(), oem_number: form.oem_number.trim() || null, description: form.description.trim(),
      manufacturer_id: form.manufacturer_id || null, category_id: form.category_id || null,
      location_id: form.location_id || null, supplier_id: form.supplier_id || null,
      stock_actual: form.stock_actual, stock_min: form.stock_min, stock_max: form.stock_max,
      unit_type: form.unit_type, weight_kg: form.weight_kg || null, length_cm: form.length_cm || null,
      width_cm: form.width_cm || null, height_cm: form.height_cm || null,
      lot_number: form.lot_number.trim() || null, expiry_date: form.expiry_date || null,
      notes: form.notes.trim() || null, barcode: form.barcode.trim() || null
    };

    let result;
    if (editingId) result = await supabase.from("aut_parts").update(payload).eq("id", editingId);
    else result = await supabase.from("aut_parts").insert([payload]).select();

    if (result.error) { setSaving(false); setErrorMsg(result.error.code === "23505" ? "El código de parte ya existe." : "Error: " + result.error.message); return; }

    const partId = editingId || (result.data as any[])[0].id;

    await supabase.from("aut_part_vehicles").delete().eq("part_id", partId);
    if (selectedVehicles.length) {
      await supabase.from("aut_part_vehicles").insert(selectedVehicles.map(vid => ({ part_id: partId, vehicle_id: vid })));
    }

    setSaving(false); setIsModalOpen(false); fetchItems();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("aut_part_vehicles").delete().eq("part_id", deleteTarget.id);
    const { error } = await supabase.from("aut_parts").update({ is_active: false }).eq("id", deleteTarget.id);
    if (error) setErrorMsg("Error al eliminar: " + error.message);
    else { setDeleteTarget(null); fetchItems(); }
  }

  const filtered = items.filter(i =>
    i.description.toLowerCase().includes(search.toLowerCase()) ||
    i.part_number.toLowerCase().includes(search.toLowerCase()) ||
    (i.oem_number && i.oem_number.toLowerCase().includes(search.toLowerCase())) ||
    (i.manufacturer?.name && i.manufacturer.name.toLowerCase().includes(search.toLowerCase()))
  );

  function exportCsv() {
    const headers = ["Código", "OEM", "Descripción", "Fabricante", "Categoría", "Ubicación", "Stock", "Stock Mín", "Stock Máx", "Unidad", "Lote", "Caducidad"];
    const rows = filtered.map(p => [
      p.part_number, p.oem_number || "", p.description, p.manufacturer?.name || "", p.category?.name || "",
      p.location?.code || "", p.stock_actual, p.stock_min, p.stock_max, p.unit_type, p.lot_number || "", p.expiry_date || ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "inventario.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const stockClass = (p: any) => p.stock_actual <= p.stock_min ? "text-red-600 font-bold" : p.stock_actual >= p.stock_max ? "text-amber-600 font-bold" : "text-slate-900";

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span> <span className="text-slate-600 font-medium">Inventario</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Inventario</h1>
          <p className="text-slate-500">{items.length} repuesto{items.length !== 1 ? "s" : ""} activo{items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={items.length === 0} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all font-medium cursor-pointer disabled:opacity-50">
            <Download size={18} /> Exportar CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium cursor-pointer">
            <Plus size={18} /> Nuevo Repuesto
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por código, OEM, descripción o fabricante..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <Skeleton variant="table" rows={5} cols={8} /> : filtered.length === 0 ? (
          <EmptyState title={search ? "Sin resultados" : "Inventario vacío"} description={search ? "Intenta con otros términos." : "Agrega el primer repuesto al catálogo."} action={search ? undefined : { label: "Nuevo Repuesto", onClick: openCreate }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-3 py-3 font-semibold">Código</th>
                  <th className="px-3 py-3 font-semibold">Descripción</th>
                  <th className="px-3 py-3 font-semibold">Fabricante</th>
                  <th className="px-3 py-3 font-semibold">Categoría</th>
                  <th className="px-3 py-3 font-semibold">Ubicación</th>
                  <th className="px-3 py-3 font-semibold text-right">Stock</th>
                  <th className="px-3 py-3 font-semibold">Vehículos</th>
                  <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">{p.part_number}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900">{p.description}</div>
                      {p.oem_number && <div className="text-[10px] text-slate-400 mt-0.5 font-mono">OEM: {p.oem_number}</div>}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{p.manufacturer?.name || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px]">{p.category?.name || "Sin cat."}</span></td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{p.location?.code || <span className="text-slate-300 italic">—</span>}</td>
                    <td className={`px-3 py-3 text-right ${stockClass(p)}`}>{p.stock_actual}</td>
                    <td className="px-3 py-3 text-[11px] text-slate-400 max-w-[140px] truncate">{p.vehicles.length > 0 ? p.vehicles.slice(0, 2).join(", ") + (p.vehicles.length > 2 ? ` +${p.vehicles.length - 2}` : "") : <span className="text-slate-300 italic">—</span>}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"><Edit3 size={15} /></button>
                        <button onClick={() => setDeleteTarget(p)} className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"><Trash2 size={15} /></button>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Package size={20} className="text-blue-600" />{editingId ? "Editar" : "Nuevo"} Repuesto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Código *</label>
                  <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 font-mono" placeholder="SKU-001" value={form.part_number} onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Número OEM</label>
                  <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 font-mono" placeholder="12345-ABC" value={form.oem_number} onChange={e => setForm(f => ({ ...f, oem_number: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción *</label>
                <textarea className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 h-16 resize-none" required placeholder="Nombre descriptivo del repuesto" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fabricante</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.manufacturer_id} onChange={e => setForm(f => ({ ...f, manufacturer_id: e.target.value }))}>
                    <option value="">Sin fabricante</option>
                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Proveedor</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Categoría</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ubicación</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}>
                    <option value="">Sin ubicación</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Actual</label>
                  <input type="number" min="0" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.stock_actual} onChange={e => setForm(f => ({ ...f, stock_actual: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Mín</label>
                  <input type="number" min="0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.stock_min} onChange={e => setForm(f => ({ ...f, stock_min: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Máx</label>
                  <input type="number" min="0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.stock_max} onChange={e => setForm(f => ({ ...f, stock_max: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unidad</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.unit_type} onChange={e => setForm(f => ({ ...f, unit_type: e.target.value }))}>
                    <option value="Unidad">Unidad</option>
                    <option value="Caja">Caja</option>
                    <option value="Kg">Kg</option>
                    <option value="Litro">Litro</option>
                    <option value="Metro">Metro</option>
                    <option value="Par">Par</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Código de Barras</label>
                  <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 font-mono" placeholder="123456789012" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Número de Lote</label>
                  <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 font-mono" placeholder="Lote-001" value={form.lot_number} onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Largo (cm)</label>
                  <input type="number" min="0" step="0.1" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.length_cm} onChange={e => setForm(f => ({ ...f, length_cm: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ancho (cm)</label>
                  <input type="number" min="0" step="0.1" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.width_cm} onChange={e => setForm(f => ({ ...f, width_cm: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Alto (cm)</label>
                  <input type="number" min="0" step="0.1" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Peso (kg)</label>
                  <input type="number" min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha de Caducidad</label>
                  <input type="date" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notas</label>
                  <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="Notas adicionales" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Vehículos Compatibles</label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {vehicles.length === 0 && <p className="text-xs text-slate-400 col-span-3">No hay vehículos registrados.</p>}
                  {vehicles.map(v => (
                    <label key={v.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedVehicles.includes(v.id)} onChange={() => setSelectedVehicles(prev => prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id])} />
                      {v.brand} {v.model}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                  {saving ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={deleteTarget !== null} title="Desactivar Repuesto" message={`¿Desactivar "${deleteTarget?.description}"? Quedará oculto del inventario activo.`} variant="danger" confirmLabel="Sí, desactivar" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
