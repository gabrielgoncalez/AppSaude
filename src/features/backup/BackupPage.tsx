import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import {
  getBackupFilename,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from "../../lib/backup";
import type { AppData, BackupSummary } from "../../types/appData";

type BackupPageProps = {
  data: AppData;
  onClearTestData: () => void;
  onImport: (data: AppData) => void;
  onReset: () => void;
};

export function BackupPage({
  data,
  onClearTestData,
  onImport,
  onReset,
}: BackupPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<BackupSummary | undefined>();
  const [pendingData, setPendingData] = useState<AppData | undefined>();
  const [error, setError] = useState("");

  function exportJson() {
    const blob = new Blob([serializeBackup(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getBackupFilename();
    link.click();
    URL.revokeObjectURL(url);
  }

  async function readFile(file?: File) {
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const envelope = parseBackup(raw);
      setSummary(summarizeBackup(envelope));
      setPendingData(envelope.data);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Backup invalido.");
      setSummary(undefined);
      setPendingData(undefined);
    }
  }

  function confirmImport() {
    if (pendingData) {
      onImport(pendingData);
      setPendingData(undefined);
      setSummary(undefined);
    }
  }

  function clearTestData() {
    if (
      confirm(
        "Limpar treinos, check-ins, peso atual, agenda, punicoes e resgates de teste? O plano e as recompensas cadastradas serao mantidos.",
      )
    ) {
      onClearTestData();
    }
  }

  function reset() {
    if (confirm("Resetar todos os dados do Gigante Agil?")) {
      onReset();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
          Backup
        </p>
        <h2 className="text-2xl font-black text-white">Backup de seguranca</h2>
      </div>

      <Card>
        <p className="rounded-lg border border-orange-400/30 bg-orange-400/10 p-3 text-sm font-bold text-orange-100">
          Seus dados principais ficam salvos na sua conta Google via Firebase/Firestore.
          O backup JSON serve como seguranca extra, migracao manual ou restauracao.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button icon={<Download size={18} />} onClick={exportJson}>
            Exportar JSON
          </Button>
          <Button
            icon={<Upload size={18} />}
            onClick={() => inputRef.current?.click()}
            variant="secondary"
          >
            Importar JSON
          </Button>
          <Button icon={<RotateCcw size={18} />} onClick={clearTestData} variant="secondary">
            Limpar testes
          </Button>
          <Button icon={<Trash2 size={18} />} onClick={reset} variant="danger">
            Resetar app
          </Button>
        </div>
        <input
          accept="application/json"
          className="hidden"
          onChange={(event) => void readFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
      </Card>

      {error ? (
        <Card>
          <p className="font-bold text-rose-200">{error}</p>
        </Card>
      ) : null}

      {summary ? (
        <Card>
          <h3 className="text-lg font-black text-white">Resumo encontrado</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <p>Versao: {summary.version}</p>
            <p>Sessoes: {summary.sessions}</p>
            <p>Check-ins: {summary.checkins}</p>
            <p>Recompensas: {summary.rewards}</p>
          </div>
          <Button className="mt-4 w-full" onClick={confirmImport}>
            Importar e substituir
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
