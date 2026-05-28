import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/Button";
import type { Reward, RewardCategory } from "../../types/rewards";

type RewardFormProps = {
  onCreate: (reward: Reward) => void;
};

const categories: RewardCategory[] = [
  "treino",
  "roupa",
  "equipamento",
  "lazer",
  "especial",
];

export function RewardForm({ onCreate }: RewardFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [costXp, setCostXp] = useState(500);
  const [category, setCategory] = useState<RewardCategory>("treino");

  function create() {
    if (!title.trim()) {
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      costXp,
      category,
      claimed: false,
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setDescription("");
    setCostXp(500);
    setCategory("treino");
  }

  return (
    <div className="grid gap-2">
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Criar recompensa"
        value={title}
      />
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Descrição opcional"
        value={description}
      />
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          min={0}
          onChange={(event) => setCostXp(Number(event.target.value))}
          type="number"
          value={costXp}
        />
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          onChange={(event) => setCategory(event.target.value as RewardCategory)}
          value={category}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button icon={<Plus size={18} />} onClick={create}>
          Criar
        </Button>
      </div>
    </div>
  );
}
