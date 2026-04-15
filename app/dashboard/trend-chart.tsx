"use client";

import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";

type Row = { week: string; total: number; billable: number; utilisation: number };

export default function TrendChart({
  data,
  target,
}: {
  data: Row[];
  target: number;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" fontSize={10} tick={{ fill: "#64748b" }} />
          <YAxis
            yAxisId="hours"
            fontSize={10}
            tick={{ fill: "#64748b" }}
            label={{ value: "hours", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            fontSize={10}
            tick={{ fill: "#64748b" }}
            unit="%"
          />
          <Tooltip
            contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="hours" dataKey="billable" name="Billable" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="hours" dataKey="total" name="Total" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="utilisation"
            name="Utilisation %"
            stroke="#2b5fd1"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <ReferenceLine
            yAxisId="pct"
            y={Math.round(target * 100)}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: `target ${Math.round(target * 100)}%`, fontSize: 10, fill: "#b45309" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
