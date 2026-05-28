import { Gift, RotateCcw } from "lucide-react";
import { Button } from "../../components/Button";
import type { Reward } from "../../types/rewards";

type RewardCardProps = {
  reward: Reward;
  availableXp: number;
  onClaim: (reward: Reward) => void;
  onUndo: (reward: Reward) => void;
};

export function RewardCard({
  reward,
  availableXp,
  onClaim,
  onUndo,
}: RewardCardProps) {
  const canClaim = availableXp >= reward.costXp;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {reward.category}
          </p>
          <h3 className="mt-1 font-black text-white">{reward.title}</h3>
          {reward.description ? (
            <p className="mt-1 text-sm text-slate-400">{reward.description}</p>
          ) : null}
        </div>
        <span className="rounded-md bg-orange-400/10 px-2 py-1 text-sm font-black text-orange-200">
          {reward.costXp} moedas
        </span>
      </div>
      {reward.claimed ? (
        <Button
          className="mt-3 w-full"
          icon={<RotateCcw size={16} />}
          onClick={() => onUndo(reward)}
          variant="secondary"
        >
          Desfazer resgate
        </Button>
      ) : (
        <Button
          className="mt-3 w-full"
          disabled={!canClaim}
          icon={<Gift size={16} />}
          onClick={() => onClaim(reward)}
        >
          Resgatar
        </Button>
      )}
    </div>
  );
}
