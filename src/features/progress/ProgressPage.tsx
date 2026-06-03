import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { getBodyRouteStatus } from "../../lib/bodyMetricsEngine";
import {
  getExerciseLoadTrend,
  getExerciseRepsTrend,
  getFrequencyByWeek,
  getRadarProfile,
  getRecentPrs,
  getWeightTrend,
  getWeeklyVolume,
  getWeeklyXp,
} from "../../lib/calculations";
import {
  getExerciseAnalysis,
  getLineageAnalysis,
  getPlanExercises,
  getPlanLineages,
  type RepsByWeightPoint,
} from "../../lib/exerciseAnalytics";
import { getCapoeiraProgressSummary } from "../../lib/capoeiraProgress";
import { formatKg } from "../../lib/progression";
import type { AppData } from "../../types/appData";
import { ChartFrame } from "./charts/ChartFrame";
import { ExerciseTrendChart } from "./charts/ExerciseTrendChart";
import { FrequencyChart } from "./charts/FrequencyChart";
import { VolumeChart } from "./charts/VolumeChart";
import { WeightChart } from "./charts/WeightChart";
import { XpChart } from "./charts/XpChart";

type ProgressPageProps = {
  data: AppData;
};

export function ProgressPage({ data }: ProgressPageProps) {
  const exercises = getPlanExercises(data.trainingPlan, false);
  const fallbackExercises = exercises.length ? exercises : getPlanExercises(data.trainingPlan);
  const lineages = getPlanLineages(data.trainingPlan);
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    fallbackExercises[0]?.exercise.id ?? "",
  );
  const [selectedLineageId, setSelectedLineageId] = useState(lineages[0]?.id ?? "");
  const currentExerciseId = fallbackExercises.some(
    (item) => item.exercise.id === selectedExerciseId,
  )
    ? selectedExerciseId
    : fallbackExercises[0]?.exercise.id ?? "";
  const currentLineageId = lineages.some((lineage) => lineage.id === selectedLineageId)
    ? selectedLineageId
    : lineages[0]?.id ?? "";
  const analysis = getExerciseAnalysis(data, currentExerciseId);
  const lineageAnalysis = currentLineageId
    ? getLineageAnalysis(data, currentLineageId)
    : undefined;
  const prs = getRecentPrs(data.sessions);
  const bodyRoute = getBodyRouteStatus(data);
  const technical = getTechnicalSummary(data);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
          Evolucao
        </p>
        <h2 className="text-2xl font-black text-white">Onda por exercicio</h2>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Exercicio especifico
            <select
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-white"
              onChange={(event) => setSelectedExerciseId(event.target.value)}
              value={currentExerciseId}
            >
              {fallbackExercises.map((item) => (
                <option key={item.exercise.id} value={item.exercise.id}>
                  {item.exercise.name} - {item.workoutName}
                </option>
              ))}
            </select>
          </label>

          {lineages.length ? (
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Linhagem do movimento
              <select
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-white"
                onChange={(event) => setSelectedLineageId(event.target.value)}
                value={currentLineageId}
              >
                {lineages.map((lineage) => (
                  <option key={lineage.id} value={lineage.id}>
                    {lineage.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black text-white">Rota do Corpo</h3>
        <p className="mt-2 text-sm font-bold text-teal-200">{bodyRoute.title}</p>
        <p className="mt-1 text-sm text-slate-300">{bodyRoute.message}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Peso" value={`${data.profile.currentWeightKg.toFixed(1)} kg`} />
          <Metric label="Cintura" value={formatCm(bodyRoute.diff?.waistNavelCm)} />
          <Metric label="Abdomen" value={formatCm(bodyRoute.diff?.abdomenWidestCm)} />
          <Metric label="Quadril" value={formatCm(bodyRoute.diff?.hipCm)} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
              Analise da Onda
            </p>
            <h3 className="mt-1 text-xl font-black text-white">
              {analysis.item?.exercise.name ?? "Sem exercicio"}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {analysis.suggestion.message}
            </p>
          </div>
          <span className="rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-teal-100">
            {analysis.suggestion.title}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Maior carga" value={formatOptionalKg(analysis.maxWeightKg)} />
          <Metric label="Ultima carga" value={formatOptionalKg(analysis.lastWeightKg)} />
          <Metric label="Meta do mes" value={formatOptionalKg(analysis.monthlyTargetKg)} />
          <Metric label="Semanas na carga" value={`${analysis.weeksAtMaxWeight}`} />
        </div>

        {analysis.emptyHint ? (
          <p className="mt-4 rounded-md bg-slate-950 px-3 py-2 text-sm text-slate-400">
            {analysis.emptyHint}
          </p>
        ) : null}
      </Card>

      {lineageAnalysis ? (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">
            Variacao por linhagem
          </p>
          <h3 className="mt-1 text-xl font-black text-white">{lineageAnalysis.name}</h3>
          <p className="mt-2 text-sm text-slate-300">
            Maquina, halteres e livre mantem historicos separados. Esta visao compara
            o movimento sem misturar cargas que nao significam a mesma coisa.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {lineageAnalysis.variants.map((variant) => (
              <div
                className="rounded-md border border-slate-800 bg-slate-950 p-3"
                key={variant.exerciseId}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-white">{variant.exerciseName}</p>
                  <span className="rounded-md bg-orange-400/10 px-2 py-1 text-xs font-bold text-orange-100">
                    {variant.variantLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Metric label="Maior" value={formatOptionalKg(variant.maxWeightKg)} />
                  <Metric label="Ultima" value={formatOptionalKg(variant.lastWeightKg)} />
                  <Metric label="Sessoes" value={`${variant.sessions}`} />
                </div>
              </div>
            ))}
          </div>

          {lineageAnalysis.emptyHint ? (
            <p className="mt-4 rounded-md bg-slate-950 px-3 py-2 text-sm text-slate-400">
              {lineageAnalysis.emptyHint}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ExerciseTrendChart
          data={getExerciseLoadTrend(data.sessions, currentExerciseId)}
          title="Historico de carga"
        />
        <ExerciseTrendChart
          data={getExerciseRepsTrend(data.sessions, currentExerciseId)}
          title="Repeticoes totais por sessao"
        />
        <RepsByWeightChart data={analysis.repsByWeight} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeightChart
          data={getWeightTrend(data.bodyCheckins, data.profile.startWeightKg)}
        />
        <VolumeChart data={getWeeklyVolume(data.sessions)} />
        <XpChart data={getWeeklyXp(data.sessions)} />
        <FrequencyChart data={getFrequencyByWeek(data.sessions)} />
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-black text-white">Perfil atual</h3>
        <div className="h-72">
          <ResponsiveContainer height="100%" width="100%">
            <RadarChart data={getRadarProfile(data)}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="name" stroke="#cbd5e1" />
              <Radar
                dataKey="value"
                fill="#14b8a6"
                fillOpacity={0.28}
                stroke="#14b8a6"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black text-white">Evolução técnica</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Basquete" value={technical.basketball} />
          <Metric label="Boxe" value={technical.boxing} />
          <Metric label="Capoeira" value={technical.capoeira} />
          <Metric label="Dança" value={technical.dance} />
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black text-white">PRs recentes</h3>
        {prs.length ? (
          <div className="mt-3 grid gap-2">
            {prs.map((pr) => (
              <div
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-teal-100"
                key={pr}
              >
                {pr}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Primeira carga maxima aparece apos um treino." />
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-950 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function RepsByWeightChart({ data }: { data: RepsByWeightPoint[] }) {
  return (
    <ChartFrame isEmpty={data.length === 0} title="Reps por carga">
      <div className="h-64">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
            <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

function formatOptionalKg(value?: number): string {
  return value ? formatKg(value) : "-";
}

function formatCm(value?: number): string {
  if (value === undefined) {
    return "-";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} cm`;
}

function getTechnicalSummary(data: AppData) {
  const technicalSessions = data.sessions.filter(
    (session) => session.technicalBlocks?.length || !session.workoutId.startsWith("treino-"),
  );
  const count = (workoutId: string) =>
    technicalSessions.filter((session) => session.workoutId === workoutId).length;
  const capoeira = getCapoeiraProgressSummary(data);

  return {
    basketball: `${count("basquete-handles")} sessões`,
    boxing: `${count("boxe")} sessões`,
    capoeira: `${capoeira.completedCards} cards / ${capoeira.mastered} dom. / ${capoeira.validating} val.`,
    dance: `${count("danca")} sessões`,
  };
}
