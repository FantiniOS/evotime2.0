"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { BarChart3 } from "lucide-react";

export interface DailyWorkloadData {
  day: string;
  fullDay: string;
  aulas: number;
  horas: number;
}

const DEFAULT_WORKLOAD_DATA: DailyWorkloadData[] = [
  { day: "Segunda", fullDay: "Segunda-feira", aulas: 94, horas: 78 },
  { day: "Terça", fullDay: "Terça-feira", aulas: 98, horas: 82 },
  { day: "Quarta", fullDay: "Quarta-feira", aulas: 90, horas: 75 },
  { day: "Quinta", fullDay: "Quinta-feira", aulas: 92, horas: 77 },
  { day: "Sexta", fullDay: "Sexta-feira", aulas: 76, horas: 63 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: DailyWorkloadData;
  }>;
}

function CustomBarTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-xs">
      <p className="font-bold text-slate-100 mb-1.5">{data.fullDay}</p>
      <div className="flex items-center justify-between gap-5">
        <span className="text-slate-400">Aulas alocadas:</span>
        <span className="font-bold text-sky-400">{data.aulas} aulas</span>
      </div>
      <div className="flex items-center justify-between gap-5 mt-1">
        <span className="text-slate-400">Carga estimada:</span>
        <span className="font-medium text-slate-200">{data.horas}h</span>
      </div>
    </div>
  );
}

interface DailyWorkloadChartProps {
  data?: DailyWorkloadData[];
  schoolName?: string;
}

export default function DailyWorkloadChart({
  data = [],
  schoolName,
}: DailyWorkloadChartProps) {
  const totalWeekly = data.reduce((acc, d) => acc + d.aulas, 0);
  const isEmpty = data.length === 0 || totalWeekly === 0;
  const peakDay = [...data].sort((a, b) => b.aulas - a.aulas)[0];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Carga Horária por Dia da Semana
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
              Seg - Sex
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {schoolName
              ? `Distribuição diária de aulas em ${schoolName}`
              : "Distribuição total de aulas ministradas por dia da semana"}
          </p>
        </div>

        <div className="w-9 h-9 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
      </div>

      {/* Área do Gráfico de Barras */}
      <div className="h-72 w-full flex items-center justify-center">
        {isEmpty ? (
          <div className="w-full h-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center">
            <BarChart3 className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-xs text-slate-400 font-medium">
              Gráficos serão gerados após os primeiros cadastros
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barSize={44}
            >
              <defs>
                <linearGradient
                  id="blueIndigoGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                domain={[0, 115]}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                cursor={{ fill: "#f1f5f9", radius: 8 }}
              />
              <Bar
                dataKey="aulas"
                name="Aulas"
                fill="url(#blueIndigoGradient)"
                radius={[8, 8, 0, 0]}
                activeBar={{ fill: "#4338ca" }}
                isAnimationActive={true}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          {isEmpty
            ? "Pico semanal: Sem dados cadastrados"
            : `Pico semanal: ${peakDay?.fullDay} (${peakDay?.aulas} aulas)`}
        </span>
        <span className="font-semibold text-slate-700">
          Total: {totalWeekly} aulas
        </span>
      </div>
    </div>
  );
}
