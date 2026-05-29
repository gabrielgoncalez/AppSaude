import { EmptyState } from "../../components/EmptyState";
import type { PrescribedBlock, TodayPrescription } from "../../lib/prescriptionEngine";
import type {
  Exercise,
  SetLog,
  SkillWorkoutMetrics,
  TrainingSession,
  Workout,
} from "../../types/training";
import { DailyWorkoutRunner } from "./DailyWorkoutRunner";

type TodayWorkoutPageProps = {
  workout: Workout;
  session?: TrainingSession;
  sessions: TrainingSession[];
  previousSets: Map<string, SetLog>;
  prescription?: TodayPrescription;
  onAddSet: (exercise: Exercise, set: SetLog) => void;
  onFinishExerciseSet: (exercise: Exercise, set: SetLog) => void;
  onCompleteChecklistItem: (block: PrescribedBlock, item: Exercise) => void;
  onCompleteChecklistItemAndWorkout: (block: PrescribedBlock, item: Exercise) => void;
  onCompleteSkillWorkout: (metrics: SkillWorkoutMetrics) => void;
  onCompleteWorkout: () => void;
  capoeiraHasNewMovement?: boolean;
};

export function TodayWorkoutPage({
  workout,
  session,
  sessions,
  previousSets,
  prescription,
  onAddSet,
  onFinishExerciseSet,
  onCompleteChecklistItem,
  onCompleteChecklistItemAndWorkout,
  onCompleteSkillWorkout,
  onCompleteWorkout,
  capoeiraHasNewMovement,
}: TodayWorkoutPageProps) {
  if (!prescription?.prescribedBlocks.length) {
    return <EmptyState title="Sem itens ativos para hoje" />;
  }

  return (
    <DailyWorkoutRunner
      onAddSet={onAddSet}
      onCompleteChecklistItem={onCompleteChecklistItem}
      onCompleteChecklistItemAndWorkout={onCompleteChecklistItemAndWorkout}
      onCompleteSkillWorkout={onCompleteSkillWorkout}
      onCompleteWorkout={onCompleteWorkout}
      onFinishExerciseSet={onFinishExerciseSet}
      capoeiraHasNewMovement={capoeiraHasNewMovement}
      prescription={prescription}
      previousSets={previousSets}
      session={session}
      sessions={sessions}
      workout={workout}
    />
  );
}
