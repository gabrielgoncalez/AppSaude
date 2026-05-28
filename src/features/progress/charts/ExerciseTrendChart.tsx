import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "../../../lib/calculations";
import { ChartFrame } from "./ChartFrame";

type ExerciseTrendChartProps = {
  title: string;
  data: ChartPoint[];
};

export function ExerciseTrendChart({ data, title }: ExerciseTrendChartProps) {
  return (
    <ChartFrame isEmpty={data.length === 0} title={title}>
      <div className="h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
            <Line dataKey="value" stroke="#fb7185" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
