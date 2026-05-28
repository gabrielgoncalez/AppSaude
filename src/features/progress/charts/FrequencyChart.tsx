import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "../../../lib/calculations";
import { ChartFrame } from "./ChartFrame";

type FrequencyChartProps = {
  data: ChartPoint[];
};

export function FrequencyChart({ data }: FrequencyChartProps) {
  return (
    <ChartFrame isEmpty={data.length === 0} title="Frequência de treino">
      <div className="h-64">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis allowDecimals={false} stroke="#94a3b8" />
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
            <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
