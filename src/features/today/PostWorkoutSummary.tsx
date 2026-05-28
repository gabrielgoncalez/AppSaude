import { ArrowLeft, Gift, LineChart, Trophy, Zap } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { formatKg } from "../../lib/progression";
import type { WorkoutSummary } from "../../lib/postWorkout";

type PostWorkoutSummaryProps = {
  summary: WorkoutSummary;
  onBack: () => void;
  onOpenProgress: () => void;
  onOpenRewards: () => void;
};

export function PostWorkoutSummary({
  summary,
  onBack,
  onOpenProgress,
  onOpenRewards,
}: PostWorkoutSummaryProps) {
  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-teal-300">
            <Trophy size={16} />
            Treino concluído
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">{summary.workoutName}</h2>
          <p className="mt-2 text-slate-300">{summary.nextSuggestion}</p>
        </div>
        <div className="rounded-lg bg-teal-400/10 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-200">
            XP ganho
          </p>
          <p className="text-3xl font-black text-white">+{summary.earnedXp}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryStat
          label="Exercícios concluídos"
          value={`${summary.completedExercises}/${summary.totalExercises}`}
        />
        <SummaryStat
          label="Novas cargas máximas"
          value={`${summary.newMaxes.length}`}
        />
        <SummaryStat label="Próxima missão" value={summary.nextWorkoutName} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-white">
          <Zap size={16} />
          Carga máxima nova
        </h3>
        {summary.newMaxes.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {summary.newMaxes.map((max) => (
              <div className="rounded-md bg-slate-900 px-3 py-2 text-sm" key={max.exerciseId}>
                <p className="font-bold text-teal-100">{max.exerciseName}</p>
                <p className="text-slate-300">
                  {max.previousWeightKg ? `${formatKg(max.previousWeightKg)} -> ` : ""}
                  {formatKg(max.weightKg)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            Sem PR novo hoje. Ainda conta: execução consistente constrói a próxima subida.
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <Button icon={<LineChart size={16} />} onClick={onOpenProgress} variant="secondary">
          Ver evolução
        </Button>
        <Button icon={<Gift size={16} />} onClick={onOpenRewards} variant="secondary">
          Resgatar recompensa
        </Button>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>
          Voltar para hoje
        </Button>
      </div>
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-950 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
