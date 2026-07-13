import { cn } from "@/lib/utils";

interface SkeletonProps {
  variant?: "table" | "card" | "text";
  rows?: number;
  cols?: number;
}

export default function Skeleton({ variant = "table", rows = 5, cols = 6 }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-28 bg-white rounded-2xl border border-border animate-shimmer" />
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded-lg animate-shimmer" style={{ width: `${60 + Math.random() * 30}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className={cn("flex gap-4 px-6 py-4", rowIdx === 0 && "bg-slate-50")}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-4 bg-muted rounded animate-shimmer flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
