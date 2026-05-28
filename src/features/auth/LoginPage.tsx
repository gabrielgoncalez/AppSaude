import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

type LoginPageProps = {
  error?: string;
  loading?: boolean;
  onSignIn: () => void;
};

export function LoginPage({ error, loading = false, onSignIn }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-teal-400 text-slate-950">
          <ShieldCheck size={30} />
        </div>
        <h1 className="text-4xl font-black leading-tight text-white">Gigante Ágil</h1>
        <p className="mt-2 text-lg font-bold text-teal-200">
          Sincronizado com sua conta Google.
        </p>
        <Card className="mt-6">
          <h2 className="text-xl font-black text-white">Entrar para sincronizar</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Seus treinos, XP, check-ins, evolução e recompensas ficam salvos na
            sua conta e aparecem no celular e no PC.
          </p>
          {error ? (
            <p className="mt-4 rounded-md border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-100">
              {error}
            </p>
          ) : null}
          <Button
            className="mt-6 w-full"
            disabled={loading}
            icon={<LogIn size={18} />}
            onClick={onSignIn}
          >
            {loading ? "Conectando..." : "Entrar com Google"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
