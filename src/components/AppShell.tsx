import { Activity, Flame } from "lucide-react";
import type { ReactNode } from "react";
import type { AuthUser } from "../services/authService";
import { Button } from "./Button";
import { BottomNav, type ViewId } from "./BottomNav";

type AppShellProps = {
  children: ReactNode;
  current: ViewId;
  user: AuthUser;
  onNavigate: (view: ViewId) => void;
  onSignOut: () => void;
};

export function AppShell({
  children,
  current,
  user,
  onNavigate,
  onSignOut,
}: AppShellProps) {
  return (
    <div className="min-h-screen pb-24 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-obsidian/92 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-300">
              <Activity size={16} />
              <span>Força, massa e movimento.</span>
            </div>
            <h1 className="mt-1 text-2xl font-black leading-none text-white">
              Gigante Ágil
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-lg border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-right sm:block">
              <div className="flex items-center gap-1 text-xs font-bold text-orange-200">
                <Flame size={15} />
                <span>Técnica limpa</span>
              </div>
              <p className="max-w-40 truncate text-[11px] text-slate-300">
                {user.email ?? "conta Google"}
              </p>
            </div>
            <Button className="px-3" onClick={onSignOut} variant="secondary">
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-4">{children}</main>
      <BottomNav current={current} onNavigate={onNavigate} />
    </div>
  );
}
