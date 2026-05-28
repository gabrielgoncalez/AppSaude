import { ChevronDown, ChevronUp, Search, Timer, Zap } from "lucide-react";
import { useState } from "react";
import { Card } from "../../components/Card";
import {
  formatKg,
  getExerciseProgressionHistory,
  getProgressionSuggestion,
  getWaveRepRangeLabel,
} from "../../lib/progression";
import type { WavePrescription } from "../../lib/waveEngine";
import type { Exercise, ExerciseLog, SetLog, TrainingSession } from "../../types/training";
import { SetLogger } from "./SetLogger";

type ExerciseCardProps = {
  exercise: Exercise;
  log?: ExerciseLog;
  previousSet?: SetLog;
  sessions: TrainingSession[];
  currentSessionId?: string;
  prescription?: WavePrescription;
  onAddSet: (exercise: Exercise, set: SetLog) => void;
  onFinishExerciseSet: (exercise: Exercise, set: SetLog) => void;
};

export function ExerciseCard({
  exercise,
  log,
  previousSet,
  sessions,
  currentSessionId,
  prescription,
  onAddSet,
  onFinishExerciseSet,
}: ExerciseCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const lastSet = log?.sets.at(-1);
  const history = getExerciseProgressionHistory(exercise, sessions, currentSessionId);
  const suggestion = getProgressionSuggestion(exercise, log, history);
  const range =
    prescription?.repMin && prescription.repMax
      ? `${prescription.repMin}-${prescription.repMax} reps`
      : getWaveRepRangeLabel(exercise);
  const targetSets = prescription?.targetSets ?? exercise.targetSets;
  const restSec = prescription?.restSec ?? exercise.restSec;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
            {exercise.type}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-xl font-black text-white">{exercise.name}</h3>
            <button
              aria-label={`Pesquisar video de execucao para ${exercise.name}`}
              className="tap-target inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"
              onClick={() => openExerciseVideoSearch(exercise.name)}
              title="Pesquisar video de execucao"
              type="button"
            >
              <Search size={15} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
            <span className="rounded-md bg-slate-800 px-2 py-1">
              {targetSets} séries
            </span>
            <span className="rounded-md bg-slate-800 px-2 py-1">{range}</span>
            <span className="rounded-md bg-slate-800 px-2 py-1">
              {restSec}s descanso
            </span>
            {prescription?.variantLabel ? (
              <span className="rounded-md bg-orange-400/10 px-2 py-1 text-orange-100">
                {prescription.variantLabel}
              </span>
            ) : null}
            {prescription?.lineageName ? (
              <span className="rounded-md bg-slate-900 px-2 py-1 text-slate-300">
                {prescription.lineageName}
              </span>
            ) : null}
            {history.maxWeightKg ? (
              <span className="rounded-md bg-teal-400/10 px-2 py-1 text-teal-100">
                Peso máximo: {formatKg(history.maxWeightKg)}
              </span>
            ) : null}
          </div>
        </div>
        <Timer className="text-orange-300" size={22} />
      </div>

      <div
        className={`mt-3 rounded-lg border p-3 text-sm ${
          suggestion.level === "success"
            ? "border-teal-400/35 bg-teal-400/10"
            : suggestion.level === "warning"
              ? "border-rose-400/35 bg-rose-500/10"
              : "border-slate-700 bg-slate-900"
        }`}
      >
        <div className="mb-1 flex items-center gap-2 font-bold text-white">
          <Zap size={16} />
          <span>{prescription ? "Meta da Onda" : suggestion.title}</span>
        </div>
        <p className="text-slate-300">{prescription?.message ?? suggestion.message}</p>
      </div>

      <button
        className="mt-3 flex w-full items-center justify-between rounded-md bg-slate-950 px-3 py-2 text-left text-sm font-bold text-slate-200"
        onClick={() => setDetailsOpen((value) => !value)}
        type="button"
      >
        <span>Detalhes da Onda</span>
        {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {detailsOpen ? (
        <div className="mt-3 space-y-3">
          {history.maxWeightKg ? (
            <div className="grid gap-2 text-xs font-bold text-slate-300 sm:grid-cols-3">
              <span className="rounded-md bg-slate-900 px-2 py-2">
                Última vez: {formatKg(history.lastSessionMaxWeightKg ?? history.maxWeightKg)} max
              </span>
              <span className="rounded-md bg-slate-900 px-2 py-2">
                Meta do mês: {formatKg(history.monthlyTargetKg ?? history.maxWeightKg)}
              </span>
              <span className="rounded-md bg-slate-900 px-2 py-2">
                Há {history.weeksAtMaxWeight} semanas nessa carga
              </span>
            </div>
          ) : null}

          {exercise.note ? (
            <p className="rounded-md border border-orange-400/25 bg-orange-400/10 px-3 py-2 text-sm text-orange-100">
              {exercise.note}
            </p>
          ) : null}
        </div>
      ) : null}

      {log?.sets.length ? (
        <div className="mt-3 overflow-hidden rounded-md border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Série</th>
                <th className="px-3 py-2">Carga</th>
                <th className="px-3 py-2">Reps</th>
              </tr>
            </thead>
            <tbody>
              {log.sets.map((set) => (
                <tr className="border-t border-slate-800 text-slate-200" key={set.setIndex}>
                  <td className="px-3 py-2 font-bold">{set.setIndex}</td>
                  <td className="px-3 py-2">{set.weightKg ?? 0} kg</td>
                  <td className="px-3 py-2">{set.reps ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4">
        <SetLogger
          lastSet={lastSet}
          initialReps={prescription?.repMin ?? exercise.repMin ?? 8}
          nextIndex={(log?.sets.length ?? 0) + 1}
          onFinishExerciseSet={(set) => onFinishExerciseSet(exercise, set)}
          onSaveSet={(set) => onAddSet(exercise, set)}
          previousSet={previousSet}
          targetSets={targetSets}
        />
      </div>
    </Card>
  );
}

function openExerciseVideoSearch(exerciseName: string) {
  const query = encodeURIComponent(`${exerciseName} execucao correta exercicio`);
  window.open(
    `https://www.google.com/search?tbm=vid&q=${query}`,
    "_blank",
    "noopener,noreferrer",
  );
}
