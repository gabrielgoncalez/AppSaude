import {
  CalendarDays,
  ChartNoAxesColumn,
  Dumbbell,
  Gift,
  HardDriveDownload,
} from "lucide-react";

export type ViewId = "hoje" | "plano" | "evolucao" | "recompensas" | "backup";

type BottomNavProps = {
  current: ViewId;
  onNavigate: (view: ViewId) => void;
};

const items = [
  { id: "hoje", label: "Hoje", icon: Dumbbell },
  { id: "plano", label: "Plano", icon: CalendarDays },
  { id: "evolucao", label: "Evolução", icon: ChartNoAxesColumn },
  { id: "recompensas", label: "Recompensas", icon: Gift },
  { id: "backup", label: "Backup", icon: HardDriveDownload },
] satisfies Array<{ id: ViewId; label: string; icon: typeof Dumbbell }>;

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-4xl grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;

          return (
            <button
              className={`tap-target flex flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-teal-400 text-slate-950"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
              }`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
