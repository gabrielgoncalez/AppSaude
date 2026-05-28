import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "../../../lib/calculations";
import { ChartFrame } from "./ChartFrame";

type XpChartProps = {
  data: ChartPoint[];
};

export function XpChart({ data }: XpChartProps) {
  return (
    <ChartFrame isEmpty={data.length === 0} title="XP por semana">
      <div className="h-64">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
            <Area dataKey="value" fill="#14b8a6" fillOpacity={0.25} stroke="#14b8a6" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
