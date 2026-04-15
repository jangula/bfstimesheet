"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { name: string; hours: number; billable: boolean };

export default function EngagementChart({ data }: { data: Row[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" fontSize={10} tick={{ fill: "#64748b" }} />
          <YAxis fontSize={10} tick={{ fill: "#64748b" }} />
          <Tooltip
            cursor={{ fill: "rgba(43, 95, 209, 0.06)" }}
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.billable ? "#059669" : "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
