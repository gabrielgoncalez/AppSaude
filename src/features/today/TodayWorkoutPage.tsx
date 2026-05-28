import { Dumbbell } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { getActiveExercises } from "../../lib/exerciseAnalytics";
import type { TodayPrescription } from "../../lib/prescriptionEngine";
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
  onCompleteSkillWorkout,
  onCompleteWorkout,
}: TodayWorkoutPageProps) {
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
