"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Home, Download, X } from "lucide-react";
import Link from "next/link";

interface RowData {
  part_number?: string; oem_number?: string; description?: string; stock_actual?: number; stock_min?: number;
  stock_max?: number; unit_type?: string; lot_number?: string; expiry_date?: string; notes?: string; barcode?: string;
  weight_kg?: number; length_cm?: number; width_cm?: number; height_cm?: number;
}

const columnMap: Record<string, string> = {
  "codigo": "part_number", "código": "part_number", "code": "part_number", "sku": "part_number", "part_number": "part_number",
  "oem": "oem_number", "oem_number": "oem_number", "numero_oem": "oem_number", "número_oem": "oem_number",
  "descripcion": "description", "descripción": "description", "nombre": "description", "name": "description", "description": "description",
  "stock": "stock_actual", "stock_actual": "stock_actual", "existencia": "stock_actual", "cantidad": "stock_actual",
  "stock_min": "stock_min", "stock_minimo": "stock_min", "minimo": "stock_min", "mínimo": "stock_min",
  "stock_max": "stock_max", "stock_maximo": "stock_max", "maximo": "stock_max", "máximo": "stock_max",
  "unidad": "unit_type", "unit": "unit_type", "unit_type": "unit_type", "medida": "unit_type",
  "lote": "lot_number", "lot_number": "lot_number", "numero_lote": "lot_number",
  "caducidad": "expiry_date", "expiry": "expiry_date", "expiry_date": "expiry_date", "vencimiento": "expiry_date",
  "notas": "notes", "observaciones": "notes", "notes": "notes",
  "barcode": "barcode", "codigo_barras": "barcode", "código_barras": "barcode", "barra": "barcode",
  "peso": "weight_kg", "weight": "weight_kg", "weight_kg": "weight_kg",
  "largo": "length_cm", "length": "length_cm", "length_cm": "length_cm",
  "ancho": "width_cm", "width": "width_cm", "width_cm": "width_cm",
  "alto": "height_cm", "height": "height_cm", "height_cm": "height_cm",
};

export default function ImportPage() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

        if (json.length === 0) { setResult({ success: 0, errors: ["El archivo está vacío."] }); return; }

        const cols = Object.keys(json[0]);
        setColumns(cols);

        const mapped = json.map((row: any) => {
          const obj: RowData = {};
          for (const [key, val] of Object.entries(row)) {
            const field = columnMap[key.toLowerCase().trim()] || key.toLowerCase().trim().replace(/\s+/g, "_");
            if (field === "stock_actual" || field === "stock_min" || field === "stock_max") obj[field] = parseInt(val as string) || 0;
            else if (field === "weight_kg" || field === "length_cm" || field === "width_cm" || field === "height_cm") obj[field] = parseFloat(val as string) || 0;
            else (obj as any)[field] = val || undefined;
          }
          return obj;
        });
        setRows(mapped);
      } catch (err: any) {
        setResult({ success: 0, errors: ["Error al leer el archivo: " + err.message] });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setImporting(true);
    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.part_number || !row.description) {
        errors.push(`Fila ${i + 2}: Código y descripción obligatorios.`);
        continue;
      }
      const { error } = await supabase.from("aut_parts").insert([{
        part_number: row.part_number, oem_number: row.oem_number || null, description: row.description,
        stock_actual: row.stock_actual || 0, stock_min: row.stock_min || 5, stock_max: row.stock_max || 50,
        unit_type: row.unit_type || "Unidad", lot_number: row.lot_number || null, expiry_date: row.expiry_date || null,
        notes: row.notes || null, barcode: row.barcode || null, weight_kg: row.weight_kg || null,
        length_cm: row.length_cm || null, width_cm: row.width_cm || null, height_cm: row.height_cm || null,
      }]);
      if (error) {
        if (error.code === "23505") errors.push(`Fila ${i + 2} (${row.part_number}): Código duplicado.`);
        else errors.push(`Fila ${i + 2} (${row.part_number}): ${error.message}`);
      } else success++;
    }

    setImporting(false);
    setResult({ success, errors });
    if (success > 0) setRows([]);
  }

  function downloadTemplate() {
    const headers = ["Código", "OEM", "Descripción", "Stock", "Stock Mín", "Stock Máx", "Unidad", "Lote", "Caducidad", "Notas", "Código Barras", "Peso (kg)", "Largo (cm)", "Ancho (cm)", "Alto (cm)"];
    const ws = XLSX.utils.aoa_to_sheet([headers, ["Ejemplo-001", "12345-ABC", "Batería 12V 60Ah", "10", "5", "50", "Unidad", "LOTE-001", "2027-12-31", "Nota opcional", "123456789012", "1.5", "20", "15", "10"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Repuestos");
    XLSX.writeFile(wb, "plantilla_importacion_autostock.xlsx");
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-primary transition-colors"><Home size={12} /></Link>
        <span>/</span> <span className="text-slate-600 font-medium">Importar Datos</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">Importar Datos</h1>
          <p className="text-slate-500">Sube un archivo Excel para importar repuestos al inventario</p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all font-medium cursor-pointer"><Download size={18} /> Descargar Plantilla</button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <FileSpreadsheet size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">Arrastra un archivo Excel o haz clic para seleccionar</p>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium cursor-pointer"><Upload size={18} /> Seleccionar Archivo</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <p className="text-xs text-slate-400 mt-3">Formatos: .xlsx, .xls</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{rows.length}</span> filas detectadas en <span className="font-semibold text-slate-900">{columns.length}</span> columnas</p>
              <button onClick={() => { setRows([]); setResult(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"><X size={14} /> Limpiar</button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                    <th className="px-3 py-2 font-semibold sticky left-0 bg-slate-50">#</th>
                    {columns.map(col => <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap">{col}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-400 font-mono sticky left-0 bg-white">{i + 1}</td>
                      {columns.map(col => <td key={col} className="px-3 py-2 text-slate-700 max-w-[150px] truncate">{(row as any)[columnMap[col.toLowerCase()] || col] ?? ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && <p className="text-xs text-slate-400 text-center py-2">Mostrando 50 de {rows.length} filas</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRows([]); setResult(null); if (fileRef.current) fileRef.current.value = ""; }} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer">Cancelar</button>
              <button onClick={handleImport} disabled={importing} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                {importing ? <><Loader2 className="animate-spin" size={18} /> Importando...</> : `Importar ${rows.length} registro(s)`}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-xl border ${result.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-start gap-3">
              {result.errors.length === 0 ? <CheckCircle size={20} className="text-green-500 mt-0.5" /> : <AlertCircle size={20} className="text-amber-500 mt-0.5" />}
              <div>
                <p className="font-semibold text-slate-900">Importación completada</p>
                <p className="text-sm text-slate-600">{result.success} registro(s) importados correctamente.</p>
                {result.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => <p key={i} className="text-xs text-red-500">{err}</p>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
