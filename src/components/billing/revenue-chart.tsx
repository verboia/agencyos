"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface Props {
  history: Array<{ month: string; received: number; expected: number }>;
  projection: Array<{ month: string; total: number }>;
}

export function RevenueChart({ history, projection }: Props) {
  const data = [
    ...history.map((h) => ({ month: h.month, Recebido: h.received, Projetado: 0 })),
    ...projection.map((p) => ({ month: p.month, Recebido: 0, Projetado: p.total })),
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          />
          <Legend />
          <Bar dataKey="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Projetado" fill="#4A90D9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
