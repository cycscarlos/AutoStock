"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  loaded: boolean;
}

export default function BarChart({ data, loaded }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-end gap-2 h-40">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500">{item.value}</span>
            <div
              className="w-full bg-primary rounded-t-md transition-all duration-500 ease-out"
              style={{
                height: loaded ? `${(item.value / maxValue) * 100}%` : "0%",
                minHeight: item.value > 0 ? "4px" : "0px",
              }}
            />
            <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
