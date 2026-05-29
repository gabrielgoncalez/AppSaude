import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { getActiveExercises } from "../../lib/exerciseAnalytics";
import type { PrescribedBlock, TodayPrescription } from "../../lib/prescriptionEngine";
import { getStrengthBlock } from "../../lib/workoutItems";
import type {
  Exercise,
  SetLog,
  SkillWorkoutMetrics,
  TrainingSession,
  Workout,
} from "../../types/training";
import { ExerciseCard } from "./ExerciseCard";
import { SkillWorkoutLogger } from "./SkillWorkoutLogger";

type TodayWorkoutPageProps = {
  workout: Workout;
  session?: TrainingSession;
  sessions: TrainingSession[];
  previousSets: Map<string, SetLog>;
  prescription?: TodayPrescription;
  onAddSet: (exercise: Exercise, set: SetLog) => void;
  onFinishExerciseSet: (exercise: Exercise, set: SetLog) => void;
  onCompleteChecklistBlock: (block: PrescribedBlock) => void;
  onCompleteChecklistItem: (block: PrescribedBlock, item: Exercise) => void;
  onCompleteSkillWorkout: (metrics: SkillWorkoutMetrics) => void;
  onCompleteWorkout: () => void;
};

export function TodayWorkoutPage({
  workout,
  session,
  sessions,
  previousSets,
  prescription,
  onAddSet,
  onFinishExerciseSet,
  onCompleteChecklistBlock,
  onCompleteChecklistItem,
  onCompleteSkillWorkout,
  onCompleteWorkout,
}: TodayWorkoutPageProps) {
  const [mode, setMode] = useState<"gym" | "complete">("gym");
  const activeExercises = prescription?.exercises.length
    ? prescription.exercises.map((item) => item.exercise)
    : getActiveExercises(workout);

  if (!activeExercises.length) {
    return <SkillWorkoutLogger onComplete={onCompleteSkillWorkout} workout={workout} />;
  }

  const isExerciseComplete = (exercise: Exercise) => {
    const log = session?.exercises.find((item) => item.exerciseId === exercise.id);
    return Boolean(log?.completed);
  };
  const currentExercise = activeExercises.find((exercise) => !isExerciseComplete(exercise));
  const completedExercises = activeExercises.filter(isExerciseComplete);
  const currentIndex = currentExercise
    ? activeExercises.findIndex((exercise) => exercise.id === currentExercise.id)
    : -1;
  const nextExercise =
    currentIndex >= 0
      ? activeExercises
          .slice(currentIndex + 1)
          .find((exercise) => !isExerciseComplete(exercise))
      : undefined;
  const prescribedBlocks = prescription?.prescribedBlocks ?? [];
  const strengthBlockId = getStrengthBlock(workout)?.id;
  const checklistBlocks =
    mode === "gym"
      ? prescribedBlocks.filter((block) => block.id !== strengthBlockId)
      : prescribedBlocks;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
            Treino de hoje
          </p>
          <h2 className="text-2xl font-black text-white">{workout.name}</h2>
          {prescription?.waveLabel ? (
            <p className="mt-1 text-sm font-bold text-teal-200">
              {prescription.waveLabel}
            </p>
          ) : null}
        </div>
        <Button icon={<Dumbbell size={18} />} onClick={onCompleteWorkout}>
          Finalizar treino
        </Button>
      </div>

      {!activeExercises.length ? <EmptyState title="Sem exercícios para hoje" /> : null}

      {checklistBlocks.length ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
                Blocos de hoje
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {mode === "gym"
                  ? "Modo academia: checklist rapido + exercicio atual."
                  : "Modo completo: todos os blocos visiveis."}
              </p>
            </div>
            <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-700 text-sm font-bold">
              <button
                className={`px-3 py-2 ${mode === "gym" ? "bg-teal-400 text-slate-950" : "text-slate-300"}`}
                onClick={() => setMode("gym")}
                type="button"
              >
                Academia
              </button>
              <button
                className={`px-3 py-2 ${mode === "complete" ? "bg-teal-400 text-slate-950" : "text-slate-300"}`}
                onClick={() => setMode("complete")}
                type="button"
              >
                Completo
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {checklistBlocks.map((block) => (
              <ChecklistBlock
                block={block}
                compact={mode === "gym"}
                completedItems={session?.completedItems ?? []}
                isSetBlock={block.id === strengthBlockId || block.blockMode === "sets"}
                key={block.id}
                onCompleteBlock={() => onCompleteChecklistBlock(block)}
                onCompleteItem={(item) => onCompleteChecklistItem(block, item)}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {completedExercises.length ? (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Concluídos
          </p>
          <div className="mt-2 grid gap-2">
            {completedExercises.map((exercise) => {
              const log = session?.exercises.find(
                (candidate) => candidate.exerciseId === exercise.id,
              );
              return (
                <div
                  className="flex items-center justify-between rounded-md bg-slate-950 px-3 py-2 text-sm"
                  key={exercise.id}
                >
                  <span className="font-bold text-slate-100">{exercise.name}</span>
                  <span className="text-slate-500">{log?.sets.length ?? 0} séries</span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {currentExercise ? (
        <ExerciseCard
          currentSessionId={session?.id}
          exercise={currentExercise}
          key={currentExercise.id}
          log={session?.exercises.find((log) => log.exerciseId === currentExercise.id)}
          onAddSet={onAddSet}
          onFinishExerciseSet={onFinishExerciseSet}
          prescription={
            prescription?.exercises.find(
              (item) => item.exercise.id === currentExercise.id,
            )?.prescription
          }
          previousSet={previousSets.get(currentExercise.id)}
          sessions={sessions}
        />
      ) : (
        <Card>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
            Exercícios fechados
          </p>
          <p className="mt-2 text-slate-300">
            Todas as séries planejadas foram concluídas. Agora finalize o treino para
            registrar XP, ciclo e resumo.
          </p>
        </Card>
      )}

      {nextExercise ? (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Próximo exercício
          </p>
          <p className="mt-1 font-black text-white">{nextExercise.name}</p>
        </Card>
      ) : null}
    </div>
  );
}

function ChecklistBlock({
  block,
  compact,
  completedItems,
  isSetBlock,
  onCompleteBlock,
  onCompleteItem,
}: {
  block: PrescribedBlock;
  compact: boolean;
  completedItems: string[];
  isSetBlock: boolean;
  onCompleteBlock: () => void;
  onCompleteItem: (item: Exercise) => void;
}) {
  const items = block.items.map((item) => item.exercise);
  const completed = items.length > 0 && items.every((item) => completedItems.includes(item.id));
  const canMarkBlock = !isSetBlock;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-black text-white">{block.name}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {items.length} itens - {block.blockMode ?? "checklist"}{" "}
            {block.required ? "- obrigatorio" : "- recomendado"}
          </p>
        </div>
        <Button
          disabled={!canMarkBlock}
          onClick={onCompleteBlock}
          variant={completed ? "ghost" : "secondary"}
        >
          {isSetBlock ? "Logger abaixo" : completed ? "Feito" : "Marcar bloco"}
        </Button>
      </div>
      {compact ? (
        <p className="mt-2 text-sm text-slate-400">
          {items.slice(0, 3).map((item) => item.displayName ?? item.name).join(", ")}
          {items.length > 3 ? ` +${items.length - 3}` : ""}
        </p>
      ) : (
      <div className="mt-3 grid gap-2">
        {items.map((item) => {
          const itemDone = completedItems.includes(item.id);
          return isSetBlock ? (
            <div
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300"
              key={item.id}
            >
              {item.displayName ?? item.name}
            </div>
          ) : (
            <button
              className={`tap-target rounded-md border px-3 py-2 text-left text-sm font-bold transition ${
                itemDone
                  ? "border-teal-400/30 bg-teal-400/10 text-teal-100"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:border-teal-300"
              }`}
              key={item.id}
              onClick={() => onCompleteItem(item)}
              type="button"
            >
              {item.displayName ?? item.name}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
