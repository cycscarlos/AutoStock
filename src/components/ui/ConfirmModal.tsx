"use client";

import { X, Loader2, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  variant?: "danger" | "info" | "success";
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  variant = "info",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  const iconMap = {
    danger: <AlertTriangle size={20} className="text-red-600" />,
    info: <Info size={20} className="text-blue-600" />,
    success: <CheckCircle size={20} className="text-green-600" />,
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {iconMap[variant]}
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                "px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all",
                variant === "danger" && "bg-red-600 hover:bg-red-700 text-white",
                variant === "info" && "bg-blue-600 hover:bg-blue-700 text-white",
                variant === "success" && "bg-green-600 hover:bg-green-700 text-white",
              )}
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
