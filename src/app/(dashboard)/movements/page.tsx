"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeftRight, Plus, Search, X, Loader2, Edit3, Trash2, Home, Building2, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/components/AuthProvider";

type Tab = "movements" | "suppliers";

interface Movement {
  id: string; type: "entrada" | "salida" | "ajuste"; quantity: number;
  reference_type: string | null; reference_id: string | null;
  notes: string | null; created_at: string;
  part: { description: string; part_number: string } | null;
}

interface Supplier {
  id: string; name: string; contact_person: string | null; phone: string | null;
  email: string | null; address: string | null;
}

export default function MovementsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("movements");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<{ id: string; description: string; part_number: string; stock_actual: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [movModal, setMovModal] = useState(false);
  const [supModal, setSupModal] = useState(false);
  const [editingSup, setEditingSup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [movForm, setMovForm] = useState({ type: "entrada" as "entrada" | "salida", part_id: "", quantity: 1, reference_type: "", notes: "" });
  const [supForm, setSupForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "" });

  useEffect(() => { fetchMovements(); fetchSuppliers(); fetchParts(); }, []);

  async function fetchMovements() {
    const { data } = await supabase.from("aut_movements").select("*, part:aut_parts!part_id(description,part_number)").order("created_at", { ascending: false }).limit(100);
    if (data) setMovements(data as any);
  }

  async function fetchSuppliers() {
    const { data } = await supabase.from("aut_suppliers").select("*").order("name");
    if (data) setSuppliers(data as any);
    setLoading(false);
  }

  async function fetchParts() {
    const { data } = await supabase.from("aut_parts").select("id,description,part_number,stock_actual").eq("is_active", true).order("description");
    if (data) setParts(data);
  }

  async function handleRecordMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!movForm.part_id || movForm.quantity < 1) { setErrorMsg("Selecciona un repuesto y cantidad válida."); return; }
    setSaving(true); setErrorMsg("");

    const part = parts.find(p => p.id === movForm.part_id);
    if (movForm.type === "salida" && part && part.stock_actual < movForm.quantity) {
      setErrorMsg(`Stock insuficiente. Disponible: ${part.stock_actual}`); setSaving(false); return;
    }

    const { error: movErr } = await supabase.from("aut_movements").insert([{
      type: movForm.type, part_id: movForm.part_id, quantity: movForm.quantity,
      reference_type: movForm.reference_type.trim() || null, notes: movForm.notes.trim() || null,
      created_by: user?.id || null,
    }]);
    if (movErr) { setErrorMsg("Error: " + movErr.message); setSaving(false); return; }

    const delta = movForm.type === "entrada" ? movForm.quantity : -movForm.quantity;
    const { error: stockErr } = await supabase.rpc("update_part_stock", { p_part_id: movForm.part_id, p_delta: delta });
    if (stockErr) {
      const { data: current } = await supabase.from("aut_parts").select("stock_actual").eq("id", movForm.part_id).single();
      if (current) await supabase.from("aut_parts").update({ stock_actual: current.stock_actual + delta }).eq("id", movForm.part_id);
    }

    setSaving(false); setMovModal(false);
    setMovForm({ type: "entrada", part_id: "", quantity: 1, reference_type: "", notes: "" });
    fetchMovements(); fetchParts();
  }

  function openSupCreate() {
    setEditingSup(null); setSupForm({ name: "", contact_person: "", phone: "", email: "", address: "" }); setErrorMsg(""); setSupModal(true);
  }

  function openSupEdit(s: Supplier) {
    setEditingSup(s.id); setSupForm({ name: s.name, contact_person: s.contact_person || "", phone: s.phone || "", email: s.email || "", address: s.address || "" }); setErrorMsg(""); setSupModal(true);
  }

  async function handleSupSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supForm.name.trim()) { setErrorMsg("El nombre es obligatorio."); return; }
    setSaving(true); setErrorMsg("");
    const payload = { name: supForm.name.trim(), contact_person: supForm.contact_person.trim() || null, phone: supForm.phone.trim() || null, email: supForm.email.trim() || null, address: supForm.address.trim() || null };
    const result = editingSup ? await supabase.from("aut_suppliers").update(payload).eq("id", editingSup) : await supabase.from("aut_suppliers").insert([payload]);
    setSaving(false);
    if (result.error) { setErrorMsg(result.error.code === "23505" ? "Ya existe un proveedor con ese nombre." : "Error: " + result.error.message); return; }
    setSupModal(false); fetchSuppliers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const table = deleteTarget._table || "aut_movements";
    const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
    if (error) setErrorMsg("Error: " + error.message);
    else { setDeleteTarget(null); if (table === "aut_suppliers") fetchSuppliers(); else fetchMovements(); }
  }

  const typeLabel = (t: string) => t === "entrada" ? "Entrada" : t === "salida" ? "Salida" : "Ajuste";

  const filteredMovements = movements.filter(m =>
    m.part?.description.toLowerCase().includes(search.toLowerCase()) ||
    (m.reference_type && m.reference_type.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span> <span className="text-slate-600 font-medium">Movimientos</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Movimientos y Proveedores</h1>
          <p className="text-slate-500">Registro de entradas/salidas y catálogo de proveedores</p>
        </div>
        <button onClick={tab === "movements" ? () => setMovModal(true) : openSupCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium cursor-pointer">
          <Plus size={18} /> {tab === "movements" ? "Registrar Movimiento" : "Nuevo Proveedor"}
        </button>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          <button onClick={() => { setTab("movements"); setSearch(""); }} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${tab === "movements" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <ArrowLeftRight size={16} className="inline mr-1.5" />Movimientos
          </button>
          <button onClick={() => { setTab("suppliers"); setSearch(""); }} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${tab === "suppliers" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <Building2 size={16} className="inline mr-1.5" />Proveedores
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder={tab === "movements" ? "Buscar por repuesto o referencia..." : "Buscar por nombre o contacto..."} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <Skeleton variant="table" rows={4} cols={5} /> : tab === "movements" ? (
          filteredMovements.length === 0 ? (
            <EmptyState title={search ? "Sin resultados" : "Sin movimientos"} description={search ? "Intenta con otros términos." : "Registra el primer movimiento de inventario."} action={search ? undefined : { label: "Registrar Movimiento", onClick: () => setMovModal(true) }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-3 py-3 font-semibold">Tipo</th>
                    <th className="px-3 py-3 font-semibold">Ref.</th>
                    <th className="px-3 py-3 font-semibold">Repuesto</th>
                    <th className="px-3 py-3 font-semibold text-right">Cantidad</th>
                    <th className="px-3 py-3 font-semibold">Notas</th>
                    <th className="px-3 py-3 font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMovements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${m.type === "entrada" ? "bg-green-100 text-green-700" : m.type === "salida" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{typeLabel(m.type)}</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-500">{m.reference_type || <span className="text-slate-300 italic">—</span>}</td>
                      <td className="px-3 py-3 text-slate-900 font-medium">{m.part?.description || <span className="text-slate-300 italic">Eliminado</span>}</td>
                      <td className="px-3 py-3 text-right font-bold">{m.type === "entrada" ? "+" : "-"}{m.quantity}</td>
                      <td className="px-3 py-3 text-slate-500 max-w-[120px] truncate">{m.notes || <span className="text-slate-300 italic">—</span>}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{new Date(m.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredSuppliers.length === 0 ? (
            <EmptyState title={search ? "Sin resultados" : "Sin proveedores"} description={search ? "Intenta con otros términos." : "Agrega el primer proveedor."} action={search ? undefined : { label: "Nuevo Proveedor", onClick: openSupCreate }} />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredSuppliers.map(s => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      {s.contact_person && <p className="text-sm text-slate-500 mt-0.5">{s.contact_person}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openSupEdit(s)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"><Edit3 size={15} /></button>
                      <button onClick={() => setDeleteTarget({ ...s, _table: "aut_suppliers" })} className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    {s.phone && <p className="flex items-center gap-1.5"><Phone size={12} /> {s.phone}</p>}
                    {s.email && <p className="flex items-center gap-1.5"><Mail size={12} /> {s.email}</p>}
                    {s.address && <p className="flex items-center gap-1.5"><MapPin size={12} /> {s.address}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {movModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMovModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ArrowLeftRight size={20} className="text-blue-600" /> Registrar Movimiento</h3>
              <button onClick={() => setMovModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleRecordMovement} className="p-6 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}
              <div className="flex gap-4">
                <button type="button" onClick={() => setMovForm(f => ({ ...f, type: "entrada" }))} className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${movForm.type === "entrada" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>Entrada</button>
                <button type="button" onClick={() => setMovForm(f => ({ ...f, type: "salida" }))} className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${movForm.type === "salida" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>Salida</button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Repuesto *</label>
                <select required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={movForm.part_id} onChange={e => setMovForm(f => ({ ...f, part_id: e.target.value }))}>
                  <option value="">Seleccionar repuesto...</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.description} ({p.part_number}) — Stock: {p.stock_actual}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cantidad *</label>
                  <input type="number" min="1" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Referencia</label>
                  <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ej: OC-001, VENTA-001" value={movForm.reference_type} onChange={e => setMovForm(f => ({ ...f, reference_type: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notas</label>
                <textarea className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 h-16 resize-none" placeholder="Motivo del movimiento" value={movForm.notes} onChange={e => setMovForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setMovModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                  {saving ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {supModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSupModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Building2 size={20} className="text-blue-600" />{editingSup ? "Editar" : "Nuevo"} Proveedor</h3>
              <button onClick={() => setSupModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSupSave} className="p-6 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre *</label>
                <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Persona de Contacto</label>
                  <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" value={supForm.contact_person} onChange={e => setSupForm(f => ({ ...f, contact_person: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Teléfono</label>
                  <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" value={supForm.phone} onChange={e => setSupForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
                <input type="email" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" value={supForm.email} onChange={e => setSupForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dirección</label>
                <input type="text" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400" value={supForm.address} onChange={e => setSupForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setSupModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                  {saving ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={deleteTarget !== null} title={deleteTarget?._table === "aut_suppliers" ? "Eliminar Proveedor" : "Eliminar Movimiento"} message={deleteTarget?._table === "aut_suppliers" ? `¿Eliminar permanentemente "${deleteTarget?.name}"?` : "¿Eliminar este movimiento?"} variant="danger" confirmLabel="Sí, eliminar" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
