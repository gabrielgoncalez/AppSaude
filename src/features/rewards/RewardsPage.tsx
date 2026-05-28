import { Gift, WalletCards } from "lucide-react";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { StatCard } from "../../components/StatCard";
import { getBehaviorRewardTriggers } from "../../lib/behaviorRewards";
import {
  getAvailableXp,
  getClaimedXp,
  getNearestReward,
  getTotalXp,
} from "../../lib/gamification";
import type { AppData } from "../../types/appData";
import type { Reward } from "../../types/rewards";
import { RewardCard } from "./RewardCard";
import { RewardForm } from "./RewardForm";

type RewardsPageProps = {
  data: AppData;
  onCreate: (reward: Reward) => void;
  onClaim: (reward: Reward) => void;
  onUndo: (reward: Reward) => void;
};

export function RewardsPage({ data, onCreate, onClaim, onUndo }: RewardsPageProps) {
  const totalXp = getTotalXp(data);
  const availableXp = getAvailableXp(data);
  const claimedXp = getClaimedXp(data.rewards);
  const nearest = getNearestReward(data);
  const available = data.rewards.filter((reward) => !reward.claimed);
  const claimed = data.rewards.filter((reward) => reward.claimed);
  const behaviorTriggers = getBehaviorRewardTriggers(data);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
          Recompensas pessoais
        </p>
        <h2 className="text-2xl font-black text-white">Moedas viram vida real</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard icon={<WalletCards size={18} />} label="XP de jornada" tone="teal" value={`${totalXp}`} />
        <StatCard icon={<Gift size={18} />} label="Moedas disponíveis" tone="orange" value={`${availableXp}`} />
        <StatCard label="Moedas resgatadas" tone="rose" value={`${claimedXp}`} />
      </div>

      {nearest ? (
        <Card>
          <h3 className="text-lg font-black text-white">Próxima recompensa</h3>
          <p className="mt-2 text-slate-300">
            {nearest.title} - faltam {Math.max(0, nearest.costXp - availableXp)} moedas.
          </p>
        </Card>
      ) : null}

      <Card>
        <h3 className="text-lg font-black text-white">
          Conquistas que liberam recompensa
        </h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {behaviorTriggers.map((trigger) => (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                trigger.status === "unlocked"
                  ? "border-teal-400/30 bg-teal-400/10"
                  : "border-slate-700 bg-slate-950"
              }`}
              key={trigger.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-white">{trigger.title}</p>
                <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-teal-100">
                  +{trigger.bonusXp} moedas
                </span>
              </div>
              <p className="mt-1 text-slate-300">{trigger.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <RewardForm onCreate={onCreate} />
      </Card>

      <Card>
        <h3 className="text-lg font-black text-white">Disponíveis</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {available.map((reward) => (
            <RewardCard
              availableXp={availableXp}
              key={reward.id}
              onClaim={onClaim}
              onUndo={onUndo}
              reward={reward}
            />
          ))}
        </div>
        {available.length === 0 ? (
          <EmptyState title="Crie uma recompensa para dar destino às suas moedas." />
        ) : null}
      </Card>

      <Card>
        <h3 className="text-lg font-black text-white">Resgatadas</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {claimed.map((reward) => (
            <RewardCard
              availableXp={availableXp}
              key={reward.id}
              onClaim={onClaim}
              onUndo={onUndo}
              reward={reward}
            />
          ))}
        </div>
        {claimed.length === 0 ? (
          <EmptyState title="Nenhuma recompensa resgatada ainda." />
        ) : null}
      </Card>
    </div>
  );
}
