import { ChevronDown, ChevronUp, Search, Timer, Zap } from "lucide-react";
import { useState } from "react";
import { Card } from "../../components/Card";
import {
  formatKg,
  getExerciseProgressionHistory,
  getProgressionSuggestion,
  getWaveRepRangeLabel,
} from "../../lib/progression";
import { openReferenceVideoSearch } from "../../lib/referenceSearch";
import { isWorkSet } from "../../lib/sets";
import type { PrescribedVariantOption } from "../../lib/prescriptionEngine";
import type { WavePrescription } from "../../lib/waveEngine";
import {
  getEffectiveWarmupSets,
  getSetKindForIndex,
  getTotalDisplayedSets,
  getWarmupLoadRange,
  getWorkSetNumber,
  isFinalWorkSet,
} from "../../lib/workoutFlow";
import type { Exercise, ExerciseLog, SetLog, TrainingSession, Workout } from "../../types/training";
import { SetLogger } from "./SetLogger";

type ExerciseCardProps = {
  exercise: Exercise;
  log?: ExerciseLog;
  previousSet?: SetLog;
  sessions: TrainingSession[];
  currentSessionId?: string;
  prescription?: WavePrescription;
  prescribedExerciseId?: string;
  variantOptions?: PrescribedVariantOption[];
  variantLocked?: boolean;
  workout?: Workout;
  onSelectVariant?: (exerciseId: string) => void;
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
  prescribedExerciseId,
  variantOptions,
  variantLocked,
  workout,
  onSelectVariant,
  onAddSet,
  onFinishExerciseSet,
}: ExerciseCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const targetSets = prescription?.targetSets ?? exercise.targetSets;
  const warmupSets = getEffectiveWarmupSets(exercise.warmupSets);
  const displayTotalSets = getTotalDisplayedSets(targetSets, warmupSets);
  const nextIndex = (log?.sets.length ?? 0) + 1;
  const setKind = getSetKindForIndex(nextIndex, warmupSets);
  const workSetNumber = getWorkSetNumber(nextIndex, warmupSets);
  const lastWorkSet = setKind === "work"
    ? [...(log?.sets ?? [])].reverse().find((set) => set.completed && isWorkSet(set))
    : undefined;
  const history = getExerciseProgressionHistory(exercise, sessions, currentSessionId);
  const suggestion = getProgressionSuggestion(exercise, log, history);
  const range =
    prescription?.repMin && prescription.repMax
      ? `${prescription.repMin}-${prescription.repMax} reps`
      : getWaveRepRangeLabel(exercise);
  const restSec = prescription?.restSec ?? exercise.restSec;
  const displayName = exercise.displayName ?? exercise.name;
  const hasVariantOptions = Boolean(variantOptions && variantOptions.length > 1);
  const prescribedId = prescribedExerciseId ?? exercise.id;
  const usesDurationMetric =
    Boolean(exercise.durationSec) && exercise.repMin === undefined && exercise.repMax === undefined;
  const weightLabel =
    exercise.id === "graviton" || (exercise.incrementKg ?? 0) < 0
      ? "Assistencia kg"
      : "Carga kg";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
            {exercise.type}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-xl font-black text-white">{displayName}</h3>
            <button
              aria-label={`Pesquisar video de execucao para ${displayName}`}
              className="tap-target inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"
              onClick={() => openReferenceVideoSearch(exercise, workout)}
              title="Pesquisar video de execucao"
              type="button"
            >
              <Search size={15} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
            <span className="rounded-md bg-slate-800 px-2 py-1">
              {warmupSets
                ? `${displayTotalSets} séries (${targetSets} trabalho)`
                : `${targetSets} séries`}
            </span>
            <span className="rounded-md bg-slate-800 px-2 py-1">{range}</span>
            <span className="rounded-md bg-slate-800 px-2 py-1">
              {restSec}s descanso
            </span>
            {warmupSets ? (
              <span className="rounded-md bg-orange-400/15 px-2 py-1 text-orange-100">
                {warmupSets} aquecimento{exercise.warmupOptional ? " opcional" : ""}
              </span>
            ) : null}
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

      {hasVariantOptions ? (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Variação
              </span>
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white"
                disabled={variantLocked}
                onChange={(event) => onSelectVariant?.(event.target.value)}
                value={exercise.id}
              >
                {variantOptions?.map((option) => (
                  <option key={option.exercise.id} value={option.exercise.id}>
                    {option.exercise.displayName ?? option.exercise.name}
                    {option.isPrescribed ? " (indicada)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {exercise.id !== prescribedId && !variantLocked ? (
              <button
                className="rounded-md border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-teal-300 hover:text-teal-200"
                onClick={() => onSelectVariant?.(prescribedId)}
                type="button"
              >
                Voltar para indicada
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {variantLocked
              ? "Variação travada porque já existe série registrada neste card."
              : "Use quando a estação indicada estiver ocupada. O histórico fica separado por variação."}
          </p>
        </div>
      ) : null}

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

          {exercise.warmupNote ? (
            <p className="rounded-md border border-teal-400/25 bg-teal-400/10 px-3 py-2 text-sm text-teal-100">
              {exercise.warmupNote}
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
                <th className="px-3 py-2">{usesDurationMetric ? "Tempo" : "Reps"}</th>
              </tr>
            </thead>
            <tbody>
              {log.sets.map((set) => (
                <tr className="border-t border-slate-800 text-slate-200" key={set.setIndex}>
                  <td className="px-3 py-2 font-bold">
                    {set.setIndex}
                    <span className="ml-2 text-xs uppercase text-slate-500">
                      {set.setKind === "warmup" ? "aquec." : "trab."}
                    </span>
                  </td>
                  <td className="px-3 py-2">{set.weightKg ?? 0} kg</td>
                  <td className="px-3 py-2">
                    {usesDurationMetric ? `${set.durationSec ?? "-"}s` : (set.reps ?? "-")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4">
        <SetLogger
          displayTotalSets={displayTotalSets}
          initialDurationSec={exercise.durationSec}
          initialReps={prescription?.repMin ?? exercise.repMin ?? 8}
          isFinalSet={isFinalWorkSet(nextIndex, targetSets, warmupSets)}
          lastSet={lastWorkSet}
          metricMode={usesDurationMetric ? "duration" : "reps"}
          nextIndex={nextIndex}
          onFinishExerciseSet={(set) => onFinishExerciseSet(exercise, set)}
          onSaveSet={(set) => onAddSet(exercise, set)}
          onSkipWarmup={() =>
            onAddSet(exercise, {
              setIndex: nextIndex,
              setKind: "warmup",
              completed: false,
              notes: "Aquecimento opcional pulado.",
            })
          }
          previousSet={setKind === "work" ? previousSet : undefined}
          setKind={setKind}
          setLabel={setKind === "warmup" ? "Aquecimento" : `Trabalho ${workSetNumber} de ${targetSets}`}
          targetSets={targetSets}
          warmupNote={exercise.warmupNote}
          warmupSuggestion={getWarmupSuggestion(exercise, previousSet)}
          warmupOptional={exercise.warmupOptional}
          weightLabel={weightLabel}
        />
      </div>
    </Card>
  );
}

function getWarmupSuggestion(exercise: Exercise, previousSet?: SetLog): string {
  if (exercise.id === "graviton" || (exercise.incrementKg ?? 0) < 0) {
    return previousSet?.weightKg
      ? `Use mais assistência que nas séries de trabalho. Última assistência de trabalho: ${formatKg(previousSet.weightKg)}.`
      : "Não temos dado salvo, comece leve. No Graviton, isso significa usar mais assistência.";
  }

  if (!previousSet?.weightKg) {
    return "Não temos dado salvo, comece leve.";
  }

  const range = getWarmupLoadRange(previousSet.weightKg);
  if (!range) {
    return "Não temos dado salvo, comece leve.";
  }
  return `Sugestão visual: aquecer entre ${formatKg(range.minKg)} e ${formatKg(range.maxKg)} (40-50% da última carga de trabalho). Ajuste manualmente.`;
}
