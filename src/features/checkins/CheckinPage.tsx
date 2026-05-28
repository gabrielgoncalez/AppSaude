import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { isFullMeasurementDue } from "../../lib/bodyMetricsEngine";
import { buildCheckinInsight } from "../../lib/checkinInsights";
import type { AppData, BodyCheckin } from "../../types/appData";

type CheckinPageProps = {
  data: AppData;
  onSave: (checkin: BodyCheckin) => void;
};

export function CheckinPage({ data, onSave }: CheckinPageProps) {
  const [openedAt] = useState(() => Date.now());
  const [type, setType] = useState<"quick_15d" | "full_30d">(() =>
    isFullMeasurementDue(data.bodyCheckins, data.profile.startedAt) ? "full_30d" : "quick_15d",
  );
  const [weightKg, setWeightKg] = useState(data.profile.currentWeightKg);
  const [waistNavelCm, setWaistNavelCm] = useState<number | undefined>();
  const [abdomenWidestCm, setAbdomenWidestCm] = useState<number | undefined>();
  const [hipCm, setHipCm] = useState<number | undefined>();
  const [neckCm, setNeckCm] = useState<number | undefined>();
  const [chestCm, setChestCm] = useState<number | undefined>();
  const [rightArmCm, setRightArmCm] = useState<number | undefined>();
  const [leftArmCm, setLeftArmCm] = useState<number | undefined>();
  const [rightThighCm, setRightThighCm] = useState<number | undefined>();
  const [leftThighCm, setLeftThighCm] = useState<number | undefined>();
  const [rightCalfCm, setRightCalfCm] = useState<number | undefined>();
  const [leftCalfCm, setLeftCalfCm] = useState<number | undefined>();
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sleep, setSleep] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [hunger, setHunger] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [adherence, setAdherence] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [soreness, setSoreness] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [jointPain, setJointPain] = useState(false);
  const [dizziness, setDizziness] = useState(false);
  const [notes, setNotes] = useState("");

  const draftCheckin = useMemo<BodyCheckin>(
    () => ({
      id: "draft",
      date: new Date(openedAt).toISOString(),
      type,
      weightKg,
      waistCm: waistNavelCm,
      waistNavelCm,
      abdomenWidestCm,
      hipCm,
      neckCm: type === "full_30d" ? neckCm : undefined,
      chestCm: type === "full_30d" ? chestCm : undefined,
      rightArmCm: type === "full_30d" ? rightArmCm : undefined,
      leftArmCm: type === "full_30d" ? leftArmCm : undefined,
      rightThighCm: type === "full_30d" ? rightThighCm : undefined,
      leftThighCm: type === "full_30d" ? leftThighCm : undefined,
      rightCalfCm: type === "full_30d" ? rightCalfCm : undefined,
      leftCalfCm: type === "full_30d" ? leftCalfCm : undefined,
      energy,
      sleep,
      hunger,
      adherence,
      soreness,
      jointPain,
      dizziness,
      notes: notes.trim() || undefined,
      createdAt: new Date(openedAt).toISOString(),
    }),
    [
      abdomenWidestCm,
      adherence,
      chestCm,
      dizziness,
      energy,
      hipCm,
      hunger,
      jointPain,
      leftArmCm,
      leftCalfCm,
      leftThighCm,
      neckCm,
      notes,
      openedAt,
      rightArmCm,
      rightCalfCm,
      rightThighCm,
      sleep,
      soreness,
      type,
      waistNavelCm,
      weightKg,
    ],
  );
  const insight = useMemo(
    () => buildCheckinInsight(data, draftCheckin, new Date(openedAt)),
    [data, draftCheckin, openedAt],
  );

  function save() {
    onSave({
      ...draftCheckin,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-teal-300">
          Check-in corporal
        </p>
        <h2 className="text-2xl font-black text-white">
          {type === "full_30d" ? "Medição completa" : "Check-in de 15 dias"}
        </h2>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Toggle
            label="15 dias"
            onChange={() => setType("quick_15d")}
            value={type === "quick_15d"}
          />
          <Toggle
            label="30 dias completo"
            onChange={() => setType("full_30d")}
            value={type === "full_30d"}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberInput
            label="Peso atual"
            onChange={(value) => setWeightKg(value ?? 0)}
            suffix="kg"
            value={weightKg}
          />
          <NumberInput label="Cintura no umbigo" onChange={setWaistNavelCm} suffix="cm" value={waistNavelCm ?? 0} />
          <NumberInput label="Abdômen mais largo" onChange={setAbdomenWidestCm} suffix="cm" value={abdomenWidestCm ?? 0} />
          <NumberInput label="Quadril" onChange={setHipCm} suffix="cm" value={hipCm ?? 0} />
        </div>

        {type === "full_30d" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <NumberInput label="Pescoço" onChange={setNeckCm} suffix="cm" value={neckCm ?? 0} />
            <NumberInput label="Tórax/peitoral" onChange={setChestCm} suffix="cm" value={chestCm ?? 0} />
            <NumberInput label="Braço direito" onChange={setRightArmCm} suffix="cm" value={rightArmCm ?? 0} />
            <NumberInput label="Braço esquerdo" onChange={setLeftArmCm} suffix="cm" value={leftArmCm ?? 0} />
            <NumberInput label="Coxa direita" onChange={setRightThighCm} suffix="cm" value={rightThighCm ?? 0} />
            <NumberInput label="Coxa esquerda" onChange={setLeftThighCm} suffix="cm" value={leftThighCm ?? 0} />
            <NumberInput label="Panturrilha direita" onChange={setRightCalfCm} suffix="cm" value={rightCalfCm ?? 0} />
            <NumberInput label="Panturrilha esquerda" onChange={setLeftCalfCm} suffix="cm" value={leftCalfCm ?? 0} />
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ScaleInput label="Energia" onChange={setEnergy} value={energy} />
          <ScaleInput label="Sono" onChange={setSleep} value={sleep} />
          <ScaleInput label="Fome" onChange={setHunger} value={hunger} />
          <ScaleInput label="Aderência" onChange={setAdherence} value={adherence} />
          <ScaleInput label="Dor muscular" onChange={setSoreness} value={soreness} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Toggle label="Dor articular" onChange={setJointPain} value={jointPain} />
          <Toggle label="Tontura" onChange={setDizziness} value={dizziness} />
        </div>

        <textarea
          className="mt-4 min-h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Nota rápida"
          value={notes}
        />

        <Button className="mt-4 w-full" icon={<Save size={18} />} onClick={save}>
          Salvar check-in
        </Button>
      </Card>

      <Card>
        <h3 className="text-lg font-black text-white">
          Leitura prática: {insight.recommendation}
        </h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-300">
          <p>Peso desde o último check-in: {insight.weightDiffKg.toFixed(1)} kg</p>
          <p>Treinos feitos nos últimos 15 dias: {insight.sessions15d}</p>
          <p>Musculações feitas: {insight.strength15d}/6</p>
          <p>{insight.message}</p>
        </div>
      </Card>
    </div>
  );
}

type NumberInputProps = {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number | undefined) => void;
};

function NumberInput({ label, value, suffix, onChange }: NumberInputProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <div className="mt-1 flex overflow-hidden rounded-md border border-slate-700 bg-slate-950">
        <input
          className="w-full bg-transparent px-3 py-2 text-white"
          inputMode="decimal"
          onChange={(event) =>
            onChange(event.target.value === "" ? undefined : Number(event.target.value))
          }
          type="number"
          value={value || ""}
        />
        <span className="px-3 py-2 text-slate-500">{suffix}</span>
      </div>
    </label>
  );
}

type ScaleInputProps = {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
};

function ScaleInput({ label, value, onChange }: ScaleInputProps) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        onChange={(event) => onChange(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
        value={value}
      >
        {[1, 2, 3, 4, 5].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <button
      className={`tap-target rounded-md border px-3 py-2 text-sm font-bold ${
        value
          ? "border-teal-400 bg-teal-400/20 text-teal-100"
          : "border-slate-700 bg-slate-950 text-slate-200"
      }`}
      onClick={() => onChange(!value)}
      type="button"
    >
      {label}: {value ? "sim" : "não"}
    </button>
  );
}
