import { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  textColor,
  bgLight,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  textColor: string;
  bgLight: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${bgLight}`}>
        <Icon className={`w-5 h-5 ${textColor}`} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
