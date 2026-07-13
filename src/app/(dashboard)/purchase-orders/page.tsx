"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Plus, Search, X, Loader2, Home, Eye, ArrowLeft, CheckCircle, Send, Ban } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/components/AuthProvider";

interface PO { id: string; order_number: string; status: string; notes: string | null; created_at: string; supplier: { name: string } | null; items: POItem[]; }
interface POItem { id: string; part_id: string; quantity_ordered: number; quantity_received: number; unit_price: number | null; part: { description: string; part_number: string } | null; }
interface Part { id: string; description: string; part_number: string; stock_actual: number; }

const statusConfig: Record<string, { label: string; color: string; next?: string; action?: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700", next: "enviada", action: "Enviar" },
  enviada: { label: "Enviada", color: "bg-blue-100 text-blue-700", next: "recibida", action: "Recibir" },
  recibida: { label: "Recibida", color: "bg-green-100 text-green-700" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PO | null>(null);
  const [creating, setCreating] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [supId, setSupId] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [items, setItems] = useState<{ part_id: string; quantity: number; unit_price: number }[]>([]);
  const [orderNum, setOrderNum] = useState("");

  useEffect(() => { fetchOrders(); fetchSuppliers(); fetchParts(); }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase.from("aut_purchase_orders").select("*, supplier:aut_suppliers!supplier_id(name), items:aut_purchase_items(*, part:aut_parts!part_id(description,part_number))").order("created_at", { ascending: false });
    if (data) setOrders(data as any);
    setLoading(false);
  }

  async function fetchSuppliers() {
    const { data } = await supabase.from("aut_suppliers").select("id,name").order("name");
    if (data) setSuppliers(data);
  }

  async function fetchParts() {
    const { data } = await supabase.from("aut_parts").select("id,description,part_number,stock_actual").eq("is_active", true).order("description");
    if (data) setParts(data);
  }

  function startCreate() {
    const ts = Date.now().toString().slice(-6);
    setOrderNum(`OC-${ts}`); setSupId(""); setPoNotes(""); setItems([{ part_id: "", quantity: 1, unit_price: 0 }]); setErrorMsg(""); setCreating(true);
  }

  function addItem() { setItems(prev => [...prev, { part_id: "", quantity: 1, unit_price: 0 }]); }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!supId || !orderNum.trim()) { setErrorMsg("Proveedor y número de orden obligatorios."); return; }
    const validItems = items.filter(i => i.part_id && i.quantity > 0);
    if (validItems.length === 0) { setErrorMsg("Agrega al menos un repuesto con cantidad válida."); return; }
    setSaving(true); setErrorMsg("");

    const { data: order, error: orderErr } = await supabase.from("aut_purchase_orders").insert([{
      order_number: orderNum.trim(), supplier_id: supId, status: "pendiente", notes: poNotes.trim() || null, created_by: user?.id || null,
    }]).select().single();
    if (orderErr) { setErrorMsg("Error: " + orderErr.message); setSaving(false); return; }

    const { error: itemsErr } = await supabase.from("aut_purchase_items").insert(validItems.map(i => ({
      order_id: order.id, part_id: i.part_id, quantity_ordered: i.quantity, unit_price: i.unit_price || null
    })));
    if (itemsErr) { setErrorMsg("Error al agregar items: " + itemsErr.message); setSaving(false); return; }

    setSaving(false); setCreating(false); fetchOrders();
  }

  async function changeStatus(order: PO, newStatus: string) {
    setSaving(true);
    const { error } = await supabase.from("aut_purchase_orders").update({ status: newStatus }).eq("id", order.id);
    if (error) { setErrorMsg("Error: " + error.message); setSaving(false); return; }

    if (newStatus === "recibida") {
      for (const item of order.items) {
        const qty = item.quantity_ordered - item.quantity_received;
        if (qty <= 0) continue;
        await supabase.from("aut_movements").insert([{
          type: "entrada", part_id: item.part_id, quantity: qty,
          reference_type: order.order_number, notes: "Recepción OC",
          created_by: user?.id || null,
        }]);
        await supabase.rpc("update_part_stock", { p_part_id: item.part_id, p_delta: qty });
        await supabase.from("aut_purchase_items").update({ quantity_received: item.quantity_ordered }).eq("id", item.id);
      }
    }

    setSaving(false);
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
    fetchOrders();
  }

  const filtered = orders.filter(o =>
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.supplier?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span> <span className="text-slate-600 font-medium">Órdenes de Compra</span>
      </nav>

      {selectedOrder ? (
        /* Order Detail View */
        <div className="space-y-6">
          <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
            <ArrowLeft size={16} /> Volver a órdenes
          </button>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedOrder.order_number}</h2>
                <p className="text-sm text-slate-500">{selectedOrder.supplier?.name || "Sin proveedor"} · {new Date(selectedOrder.created_at).toLocaleDateString("es-MX")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[selectedOrder.status]?.color}`}>{statusConfig[selectedOrder.status]?.label}</span>
                {statusConfig[selectedOrder.status]?.next && (
                  <>
                    {selectedOrder.status === "pendiente" && (
                      <button onClick={() => changeStatus(selectedOrder, "enviada")} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">
                        <Send size={14} /> {saving ? "..." : "Enviar"}
                      </button>
                    )}
                    {selectedOrder.status === "enviada" && (
                      <button onClick={() => changeStatus(selectedOrder, "recibida")} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">
                        <CheckCircle size={14} /> {saving ? "..." : "Recibir todo"}
                      </button>
                    )}
                  </>
                )}
                {(selectedOrder.status === "pendiente" || selectedOrder.status === "enviada") && (
                  <button onClick={() => changeStatus(selectedOrder, "cancelada")} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">
                    <Ban size={14} /> Cancelar
                  </button>
                )}
              </div>
            </div>
            {selectedOrder.notes && <div className="px-6 py-3 text-sm text-slate-500 border-b border-slate-50">{selectedOrder.notes}</div>}
            <div className="p-6">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-3 py-3 font-semibold">Repuesto</th>
                    <th className="px-3 py-3 font-semibold text-right">Solicitado</th>
                    <th className="px-3 py-3 font-semibold text-right">Recibido</th>
                    <th className="px-3 py-3 font-semibold text-right">Pendiente</th>
                    <th className="px-3 py-3 font-semibold text-right">Precio Unit.</th>
                    <th className="px-3 py-3 font-semibold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        <span className="font-medium text-slate-900">{item.part?.description || "Eliminado"}</span>
                        <span className="ml-2 text-xs text-slate-400 font-mono">{item.part?.part_number}</span>
                      </td>
                      <td className="px-3 py-3 text-right">{item.quantity_ordered}</td>
                      <td className="px-3 py-3 text-right text-green-600 font-medium">{item.quantity_received}</td>
                      <td className="px-3 py-3 text-right font-bold">{item.quantity_ordered - item.quantity_received}</td>
                      <td className="px-3 py-3 text-right">{item.unit_price ? `$${item.unit_price.toFixed(2)}` : <span className="text-slate-300 italic">—</span>}</td>
                      <td className="px-3 py-3 text-right">{item.unit_price ? `$${(item.unit_price * item.quantity_ordered).toFixed(2)}` : <span className="text-slate-300 italic">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-right text-sm font-bold text-slate-900">
                Total: ${selectedOrder.items.reduce((sum, i) => sum + (i.unit_price || 0) * i.quantity_ordered, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ) : creating ? (
        /* Create Form */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Nueva Orden de Compra</h2>
            <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X size={20} /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">{errorMsg}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Número de Orden *</label>
                <input type="text" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 font-mono" value={orderNum} onChange={e => setOrderNum(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Proveedor *</label>
                <select required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={supId} onChange={e => setSupId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notas</label>
              <textarea className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400 h-16 resize-none" value={poNotes} onChange={e => setPoNotes(e.target.value)} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Repuestos</label>
                <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">+ Agregar item</button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">Repuesto</label>
                    <select className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={item.part_id} onChange={e => updateItem(idx, "part_id", e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {parts.map(p => <option key={p.id} value={p.id}>{p.description} ({p.part_number})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">Cant.</label>
                    <input type="number" min="1" className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">Precio Unit.</label>
                    <input type="number" min="0" step="0.01" className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2 flex items-end pb-1">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1 cursor-pointer"><X size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                {saving ? <><Loader2 className="animate-spin" size={18} /> Creando...</> : "Crear Orden"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* List View */
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Órdenes de Compra</h1>
              <p className="text-slate-500">{orders.length} orden{orders.length !== 1 ? "es" : ""}</p>
            </div>
            <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium cursor-pointer"><Plus size={18} /> Nueva Orden</button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar por número o proveedor..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? <Skeleton variant="table" rows={4} cols={5} /> : filtered.length === 0 ? (
              <EmptyState title={search ? "Sin resultados" : "Sin órdenes de compra"} description={search ? "Intenta con otros términos." : "Crea la primera orden de compra."} action={search ? undefined : { label: "Nueva Orden", onClick: startCreate }} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                      <th className="px-3 py-3 font-semibold">Orden</th>
                      <th className="px-3 py-3 font-semibold">Proveedor</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold text-right">Items</th>
                      <th className="px-3 py-3 font-semibold">Fecha</th>
                      <th className="px-3 py-3 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-900">{o.order_number}</td>
                        <td className="px-3 py-3 text-slate-600">{o.supplier?.name || <span className="text-slate-300 italic">—</span>}</td>
                        <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConfig[o.status]?.color}`}>{statusConfig[o.status]?.label}</span></td>
                        <td className="px-3 py-3 text-right text-slate-600">{o.items?.length || 0}</td>
                        <td className="px-3 py-3 text-slate-400 text-xs">{new Date(o.created_at).toLocaleDateString("es-MX")}</td>
                        <td className="px-3 py-3 text-right">
                          <button onClick={() => setSelectedOrder(o)} className="text-blue-600 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"><Eye size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
