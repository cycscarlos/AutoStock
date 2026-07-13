import { Package } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 rounded-2xl bg-slate-100 mb-4">
        <Package size={40} className="text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-700">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-6 text-center max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
