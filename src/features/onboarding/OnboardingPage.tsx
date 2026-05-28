import { Dumbbell } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import type { AuthUser } from "../../services/authService";

type OnboardingPageProps = {
  user?: AuthUser;
  onStart: () => void;
  onSignOut?: () => void;
};

export function OnboardingPage({ user, onStart, onSignOut }: OnboardingPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-teal-400 text-slate-950">
          <Dumbbell size={30} />
        </div>
        <h1 className="text-4xl font-black leading-tight text-white">Gigante Ágil</h1>
        <p className="mt-2 text-lg font-bold text-teal-200">
          Força, massa e movimento.
        </p>
        {user ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/76 px-3 py-2">
            <p className="truncate text-sm text-slate-300">
              {user.email ?? "conta Google conectada"}
            </p>
            {onSignOut ? (
              <Button className="px-3" onClick={onSignOut} variant="secondary">
                Sair
              </Button>
            ) : null}
          </div>
        ) : null}
        <Card className="mt-6">
          <h2 className="text-xl font-black text-white">Bem-vindo ao Gigante Ágil.</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Peso inicial</dt>
              <dd className="font-bold text-slate-50">115 kg</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Altura</dt>
              <dd className="font-bold text-slate-50">1,88 m</dd>
            </div>
            <div>
              <dt className="text-slate-400">Objetivo</dt>
              <dd className="mt-1 font-bold text-slate-50">
                emagrecer, ganhar massa e ficar atlético
              </dd>
            </div>
          </dl>
          <Button className="mt-6 w-full" icon={<Dumbbell size={18} />} onClick={onStart}>
            Começar jornada
          </Button>
        </Card>
      </div>
    </main>
  );
}
