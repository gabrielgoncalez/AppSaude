import {
  AlertTriangle,
  BadgeCheck,
  Bed,
  CalendarClock,
  Flame,
  Scale,
  Shuffle,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { SafetyAlert } from "../../components/SafetyAlert";
import { StatCard } from "../../components/StatCard";
import { getStreak, summarizeLastCheckin } from "../../lib/calculations";
import type { CheckinInsight } from "../../lib/checkinInsights";
import { daysUntilNextCheckin } from "../../lib/dates";
import {
  getLevel,
  getNearestReward,
  getNextLevel,
  getRewardCoins,
  getTotalXp,
} from "../../lib/gamification";
import { getMonthlyCommitmentSummary } from "../../lib/penaltyEngine";
import { getCurrentPhaseReading } from "../../lib/phaseEngine";
import { getCycleWorkouts } from "../../lib/schedule";
import { getTrainingInsights, type TrainingInsight } from "../../lib/trainingInsights";
import type { AppData, DayEvent } from "../../types/appData";
import type { Workout } from "../../types/training";

type DashboardPageProps = {
  data: AppData;
  workout: Workout;
  nextWorkout: Workout;
  dayEvent?: DayEvent;
  onOpenCheckin: () => void;
  onSelectTodayWorkout: (workoutId: string) => void;
  onRecoveryRest: () => void;
  checkinInsight?: CheckinInsight;
  onDismissCheckinInsight: () => void;
};

export function DashboardPage({
  data,
  workout,
  nextWorkout,
  dayEvent,
  onOpenCheckin,
  onSelectTodayWorkout,
  onRecoveryRest,
  checkinInsight,
  onDismissCheckinInsight,
}: DashboardPageProps) {
  const totalXp = getTotalXp(data);
  const rewardCoins = getRewardCoins(data);
  const level = getLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const streak = getStreak(data.sessions, data.dayEvents);
  const checkinDays = daysUntilNextCheckin(
    data.bodyCheckins,
    data.profile.startedAt,
  );
  const reward = getNearestReward(data);
  const cycleWorkouts = getCycleWorkouts(data.trainingPlan);
  const commitment = getMonthlyCommitmentSummary(data);
  const phase = getCurrentPhaseReading(data);
  const todayCompleted = dayEvent?.status === "completed";
  const recoveryMarked = dayEvent?.status === "recovery_rest";
  const canChangeWorkout = !todayCompleted && !recoveryMarked;
  const canRest = !todayCompleted && !recoveryMarked;
  const insights = getTrainingInsights(data);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
              Missão de hoje
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">{workout.name}</h2>
            <p className="mt-2 text-slate-300">
              Carga limpa, repetições honestas e sem pressa.
            </p>
            {phase.phase ? (
              <p className="mt-2 text-sm font-bold text-teal-200">
                {phase.phase.name} — semana {phase.week}
              </p>
            ) : null}
          </div>
          <Button
            icon={<CalendarClock size={18} />}
            onClick={onOpenCheckin}
            variant={checkinDays === 0 ? "primary" : "secondary"}
          >
            {checkinDays === 0 ? "Check-in hoje" : `${checkinDays} dias`}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Shuffle size={16} />
              Trocar treino de hoje
            </span>
            <select
              className="tap-target w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none transition focus:border-teal-300 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canChangeWorkout}
              onChange={(event) => onSelectTodayWorkout(event.target.value)}
              value={workout.id}
            >
              {cycleWorkouts.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              className="w-full lg:w-auto"
              disabled={!canRest}
              icon={<Bed size={18} />}
              onClick={onRecoveryRest}
              variant="secondary"
            >
              {recoveryMarked ? "Descanso marcado" : "Descanso de recuperação"}
            </Button>
          </div>
        </div>

        {dayEvent ? (
          <p className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-slate-300">
            Status de hoje: {getDayEventLabel(dayEvent)}
          </p>
        ) : null}
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Trophy size={18} />}
          label={`Nível ${level.level}`}
          tone="teal"
          value={level.name}
        />
        <StatCard
          icon={<Zap size={18} />}
          label="XP de jornada"
          tone="orange"
          value={
            nextLevel
              ? `${totalXp} / ${nextLevel.minXp}`
              : `${totalXp} total`
          }
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Moedas"
          tone="rose"
          value={`${rewardCoins}`}
        />
        <StatCard
          icon={<Scale size={18} />}
          label="Score do mês"
          value={`${commitment.score}/100`}
        />
      </div>

      {data.sessions.length < 2 ? (
        <Card>
          <h3 className="flex items-center gap-2 text-lg font-black text-white">
            <Zap size={19} />
            Primeiros dias
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Registre 2 treinos para eu calcular sua Onda, detectar padrão de agenda e
            começar a comparar evolução por exercício.
          </p>
        </Card>
      ) : null}

      {checkinInsight ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
                Check-in salvo
              </p>
              <h3 className="mt-1 text-lg font-black text-white">
                Recomendação: {checkinInsight.recommendation}
              </h3>
              <p className="mt-2 text-sm text-slate-300">{checkinInsight.message}</p>
            </div>
            <Button onClick={onDismissCheckinInsight} variant="ghost">
              Fechar
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-lg font-black text-white">
            <CalendarClock size={19} />
            Próximo treino
          </h3>
          <p className="mt-3 text-slate-300">{nextWorkout.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            Último check-in: {summarizeLastCheckin(data)}
          </p>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-lg font-black text-white">
            <BadgeCheck size={19} />
            Recompensa próxima
          </h3>
          {reward ? (
            <p className="mt-3 text-slate-300">
              {reward.title} - {reward.costXp} moedas
            </p>
          ) : (
            <p className="mt-3 text-slate-300">Tudo resgatado por enquanto.</p>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="flex items-center gap-2 text-lg font-black text-white">
          <AlertTriangle size={19} />
          Compromisso do mês
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <PenaltyStat label="Descansos" value={commitment.recoveryRestCount} />
          <PenaltyStat label="Faltas" value={commitment.missedCount} />
          <PenaltyStat label="Moedas perdidas" value={`-${commitment.coinsPenalty}`} />
          <PenaltyStat label="Próx. descanso" value={`-${commitment.nextRecoveryCoinsPenalty}`} />
          <PenaltyStat label="Próx. falta" value={`-${commitment.nextMissedCoinsPenalty}`} />
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Streak atual: {streak} treinos. Check-in atrasado:{" "}
          {commitment.lateCheckin ? "sim" : "não"}. Medição completa atrasada:{" "}
          {commitment.lateFullMeasurement ? "sim" : "não"}.
        </p>
      </Card>

      <Card>
        <h3 className="flex items-center gap-2 text-lg font-black text-white">
          <Flame size={19} />
          Leitura da agenda
        </h3>
        <div className="mt-3 grid gap-2">
          {insights.map((insight) => (
            <AgendaInsight insight={insight} key={insight.id} />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black text-white">Fase atual</h3>
        <p className="mt-2 text-sm text-slate-300">{phase.message}</p>
      </Card>

      {data.schedule.hasDebtAlert ? (
        <SafetyAlert
          alert={{
            level: "warning",
            title: "Dívida do mês",
            message:
              "Teve falta recente. O próximo treino concluído limpa este alerta visual, mas as moedas perdidas ficam registradas.",
          }}
        />
      ) : null}
    </div>
  );
}

function PenaltyStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-slate-950 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function AgendaInsight({ insight }: { insight: TrainingInsight }) {
  const tone =
    insight.tone === "warning"
      ? "border-orange-400/30 bg-orange-400/10 text-orange-100"
      : insight.tone === "success"
        ? "border-teal-400/30 bg-teal-400/10 text-teal-100"
        : "border-slate-700 bg-slate-950 text-slate-200";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
      <p className="font-black">{insight.title}</p>
      <p className="mt-1 text-slate-300">{insight.message}</p>
    </div>
  );
}

function getDayEventLabel(event: DayEvent): string {
  if (event.status === "completed") {
    return "missão concluída";
  }
  if (event.status === "recovery_rest") {
    return "descanso recuperativo";
  }
  if (event.status === "missed") {
    return "falta registrada";
  }
  if (event.status === "planned_rest") {
    return "descanso planejado";
  }
  return "treino selecionado";
}
