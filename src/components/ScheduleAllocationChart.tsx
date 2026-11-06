"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

export interface AllocationItem {
  name: string;
  value: number;
  aulas: number;
  color: string;
}

const DEFAULT_ALLOCATION_DATA: AllocationItem[] = [
  {
    name: "Aulas Alocadas",
    value: 85,
    aulas: 383,
    color: "#10b981", // Emerald 500
  },
  {
    name: "Pendentes",
    value: 15,
    aulas: 67,
    color: "#cbd5e1", // Slate 300
  },
];

interface CustomDonutTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: AllocationItem;
  }>;
}

function CustomDonutTooltip({ active, payload }: CustomDonutTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-xs">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="font-bold text-slate-100">{item.name}</span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-slate-400">Status na grade:</span>
        <span className="font-bold text-emerald-400">{item.value}%</span>
      </div>
      <div className="flex items-center justify-between gap-5 mt-1">
        <span className="text-slate-400">Volume:</span>
        <span className="font-medium text-slate-200">{item.aulas} aulas</span>
      </div>
    </div>
  );
}

interface ScheduleAllocationChartProps {
  allocatedPercent?: number;
  totalClasses?: number;
}

export default function ScheduleAllocationChart({
  allocatedPercent = 0,
  totalClasses = 0,
}: ScheduleAllocationChartProps) {
  const isEmpty = totalClasses === 0;
  const pendingPercent = Math.max(0, 100 - allocatedPercent);
  const allocatedAulas = Math.round((allocatedPercent / 100) * totalClasses);
  const pendingAulas = totalClasses - allocatedAulas;

  const allocationData: AllocationItem[] = isEmpty
    ? [
        {
          name: "Sem Cadastros",
          value: 100,
          aulas: 0,
          color: "#e2e8f0", // Cinza claro de fallback
        },
      ]
    : [
        {
          name: "Aulas Alocadas",
          value: allocatedPercent,
          aulas: allocatedAulas,
          color: "#10b981",
        },
        {
          name: "Pendentes",
          value: pendingPercent,
          aulas: pendingAulas,
          color: "#cbd5e1",
        },
      ];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Status de Alocação da Grade (Alocadas vs Pendentes)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proporção de aulas vinculadas às turmas e docentes sem conflito
          </p>
        </div>

        <div className="w-9 h-9 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <PieChartIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Área do Gráfico de Rosca (Donut Chart) */}
      <div className="relative h-60 w-full flex items-center justify-center">
        {/* Indicador Central */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-3xl font-extrabold tracking-tight ${
              isEmpty ? "text-slate-400" : "text-slate-900"
            }`}
          >
            {isEmpty ? "0%" : `${allocatedPercent}%`}
          </span>
          <span className="text-[11px] font-medium text-slate-400 mt-0.5">
            {isEmpty ? "Aulas Alocadas" : "Aulas Alocadas"}
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {!isEmpty && <Tooltip content={<CustomDonutTooltip />} />}
            <Pie
              data={allocationData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={isEmpty ? 0 : 4}
              cornerRadius={isEmpty ? 0 : 6}
              stroke="none"
              isAnimationActive={true}
              animationDuration={900}
            >
              {allocationData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda Detalhada ou Mensagem de Fallback */}
      {isEmpty ? (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center text-center">
          <p className="text-xs text-slate-400 font-medium">
            Gráficos serão gerados após os primeiros cadastros
          </p>
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
          {allocationData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50/80 border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-slate-600">
                  {item.name}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
