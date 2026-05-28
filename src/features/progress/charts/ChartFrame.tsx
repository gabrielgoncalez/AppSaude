import type { ReactNode } from "react";
import { Card } from "../../../components/Card";
import { EmptyState } from "../../../components/EmptyState";

type ChartFrameProps = {
  title: string;
  isEmpty: boolean;
  children: ReactNode;
};

export function ChartFrame({ title, isEmpty, children }: ChartFrameProps) {
  return (
    <Card>
      <h3 className="mb-4 text-lg font-black text-white">{title}</h3>
      {isEmpty ? <EmptyState title="Sem dados suficientes ainda." /> : children}
    </Card>
  );
}
