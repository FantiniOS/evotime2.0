"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Topbar from "@/components/Topbar";
import DailyWorkloadChart, {
  DailyWorkloadData,
} from "@/components/DailyWorkloadChart";
import ScheduleAllocationChart from "@/components/ScheduleAllocationChart";
import EmptyState from "@/components/EmptyState";
import {
  SCHOOLS_LIST,
  SCHOOLS_STORAGE_KEY,
  ACTIVE_SCHOOL_STORAGE_KEY,
  TEACHERS_STORAGE_KEY,
  CLASSES_STORAGE_KEY,
  FALLBACK_EMPTY_SCHOOL,
  SchoolTenant,
} from "@/lib/schoolData";
import {
  Users,
  GraduationCap,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Lightbulb,
  AlertOctagon,
  ChevronRight,
  Cpu,
} from "lucide-react";

interface SchoolDashboardPreset {
  teachersCount: number;
  classesCount: number;
  conflictsCount: number;
  allocatedPercent: number;
  workload: DailyWorkloadData[];
  insights: {
    id: string;
    type: "alerta" | "sugestao" | "critico";
    title: string;
    detail: string;
    href: string;
    badge: string;
  }[];
}

const SCHOOL_PRESETS: Record<string, SchoolDashboardPreset> = {
  "santa-maria": {
    teachersCount: 42,
    classesCount: 18,
    conflictsCount: 3,
    allocatedPercent: 85,
    workload: [
      { day: "Segunda", fullDay: "Segunda-feira", aulas: 94, horas: 78 },
      { day: "Terça", fullDay: "Terça-feira", aulas: 98, horas: 82 },
      { day: "Quarta", fullDay: "Quarta-feira", aulas: 90, horas: 75 },
      { day: "Quinta", fullDay: "Quinta-feira", aulas: 92, horas: 77 },
      { day: "Sexta", fullDay: "Sexta-feira", aulas: 76, horas: 63 },
    ],
    insights: [
      {
        id: "ins-1",
        type: "alerta",
        title: "Alerta: Professor de Física possui 3 aulas seguidas na terça",
        detail:
          "Regra de alocação 'Evitar mais de 2 aulas consecutivas' violada para o Prof. André Santos.",
        href: "/professores",
        badge: "Regra Docente",
      },
      {
        id: "ins-2",
        type: "sugestao",
        title: "Sugestão: Otimize a grade do 1º Ano A",
        detail:
          "O Motor IA identificou uma permuta que elimina 2 janelas docentes na quarta-feira.",
        href: "/grade",
        badge: "Otimização IA",
      },
      {
        id: "ins-3",
        type: "critico",
        title:
          "Conflito: 3 choques de horário ativos aguardando redistribuição automática",
        detail:
          "Matemática e Biologia possuem sobreposição de horários nos períodos iniciais da manhã.",
        href: "/grade",
        badge: "Ação Crítica",
      },
    ],
  },
  "joao-xxiii": {
    teachersCount: 34,
    classesCount: 14,
    conflictsCount: 2,
    allocatedPercent: 91,
    workload: [
      { day: "Segunda", fullDay: "Segunda-feira", aulas: 74, horas: 62 },
      { day: "Terça", fullDay: "Terça-feira", aulas: 78, horas: 65 },
      { day: "Quarta", fullDay: "Quarta-feira", aulas: 72, horas: 60 },
      { day: "Quinta", fullDay: "Quinta-feira", aulas: 70, horas: 58 },
      { day: "Sexta", fullDay: "Sexta-feira", aulas: 66, horas: 55 },
    ],
    insights: [
      {
        id: "ins-j1",
        type: "alerta",
        title: "Alerta: Professor de Física possui 3 aulas seguidas na terça",
        detail:
          "Concentração acima do limite pedagógico detectada nas turmas do Ensino Médio.",
        href: "/professores",
        badge: "Regra Docente",
      },
      {
        id: "ins-j2",
        type: "sugestao",
        title: "Sugestão: Otimize a grade do 1º Ano A",
        detail:
          "9% das aulas semanais ainda estão pendentes de alocação definitiva.",
        href: "/grade",
        badge: "Otimização IA",
      },
      {
        id: "ins-j3",
        type: "critico",
        title:
          "Conflito: 2 choques de horário entre História e Geografia na quinta-feira",
        detail:
          "Clique para abrir a Matriz Curricular e executar o balanceamento com IA.",
        href: "/grade",
        badge: "Ação Crítica",
      },
    ],
  },
  "instituto-educacao": {
    teachersCount: 56,
    classesCount: 22,
    conflictsCount: 4,
    allocatedPercent: 82,
    workload: [
      { day: "Segunda", fullDay: "Segunda-feira", aulas: 106, horas: 88 },
      { day: "Terça", fullDay: "Terça-feira", aulas: 110, horas: 92 },
      { day: "Quarta", fullDay: "Quarta-feira", aulas: 102, horas: 85 },
      { day: "Quinta", fullDay: "Quinta-feira", aulas: 98, horas: 82 },
      { day: "Sexta", fullDay: "Sexta-feira", aulas: 84, horas: 70 },
    ],
    insights: [
      {
        id: "ins-i1",
        type: "alerta",
        title: "Alerta: Professor de Física possui 3 aulas seguidas na terça",
        detail:
          "Restrição matemática sinalizada no módulo técnico e laboratorial.",
        href: "/professores",
        badge: "Regra Docente",
      },
      {
        id: "ins-i2",
        type: "sugestao",
        title: "Sugestão: Otimize a grade do 1º Ano A",
        detail:
          "A redistribuição automática reduz o deslocamento entre salas e laboratórios.",
        href: "/grade",
        badge: "Otimização IA",
      },
      {
        id: "ins-i3",
        type: "critico",
        title:
          "Conflito: 4 choques de horário detectados nas turmas do turno matutino",
        detail:
          "Recomendado acionar o botão 'Otimizar com IA' na tela de Grade.",
        href: "/grade",
        badge: "Ação Crítica",
      },
    ],
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut" as const,
    },
  },
};

export interface ExecutiveDashboardProps {
  initialSchools?: SchoolTenant[];
  initialStats?: {
    teachersCount: number;
    classesCount: number;
  };
}

export default function ExecutiveDashboard({
  initialSchools = [],
  initialStats,
}: ExecutiveDashboardProps = {}) {
  const [activeSchool, setActiveSchool] = useState<SchoolTenant>(() => {
    if (initialSchools && initialSchools.length > 0) {
      return initialSchools[0];
    }
    return SCHOOLS_LIST[0] || FALLBACK_EMPTY_SCHOOL;
  });
  const [teachersCount, setTeachersCount] = useState<number>(
    initialStats?.teachersCount || 0
  );
  const [classesCount, setClassesCount] = useState<number>(
    initialStats?.classesCount || 0
  );
  const [conflictsCount, setConflictsCount] = useState<number>(0);
  const [allocatedPercent, setAllocatedPercent] = useState<number>(0);
  const [workload, setWorkload] = useState<DailyWorkloadData[]>([]);
  const [insights, setInsights] = useState<SchoolDashboardPreset["insights"]>([]);

  useEffect(() => {
    const syncSchool = () => {
      try {
        let list =
          initialSchools && initialSchools.length > 0
            ? initialSchools
            : SCHOOLS_LIST;
        const savedList = localStorage.getItem(SCHOOLS_STORAGE_KEY);
        if (savedList) {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        }

        const savedActiveId = localStorage.getItem(ACTIVE_SCHOOL_STORAGE_KEY);
        const school =
          (list.length > 0
            ? list.find((s) => s.id === savedActiveId) || list[0]
            : null) || FALLBACK_EMPTY_SCHOOL;
        setActiveSchool(school);

        // Carrega contagens reais dos cadastros
        let tCount = 0;
        const savedTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
        if (savedTeachers) {
          const parsedT = JSON.parse(savedTeachers);
          if (Array.isArray(parsedT)) {
            tCount = parsedT.length;
          }
        }
        setTeachersCount(tCount);

        let cCount = 0;
        const savedClasses = localStorage.getItem(CLASSES_STORAGE_KEY);
        if (savedClasses) {
          const parsedC = JSON.parse(savedClasses);
          if (Array.isArray(parsedC)) {
            cCount = parsedC.length;
          }
        }
        setClassesCount(cCount);

        // Dashboard zerado para início limpo
        setConflictsCount(0);
        setAllocatedPercent(0);
        setWorkload([]);
        setInsights([]);
      } catch {
        setActiveSchool(FALLBACK_EMPTY_SCHOOL);
      }
    };

    syncSchool();
    window.addEventListener("evotime:school-change", syncSchool);
    window.addEventListener("evotime:schools-updated", syncSchool);
    return () => {
      window.removeEventListener("evotime:school-change", syncSchool);
      window.removeEventListener("evotime:schools-updated", syncSchool);
    };
  }, []);

  const totalWeeklyClasses = workload.reduce(
    (acc, d) => acc + d.aulas,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de Navegação Superior (Topbar) */}
      <Topbar />

      {/* Container Centralizado */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* 1. Cabeçalho Contextual (Escola Ativa) + Badge "Motor IA Conectado" */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Visão Geral - {activeSchool.name}
              </h1>

              {/* Selo Verde com Ícone de Brilho indicando "Motor IA Conectado" */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Motor IA Conectado</span>
              </span>
            </div>

            <p className="text-sm text-slate-500 mt-1.5">
              Monitoramento executivo em tempo real de professores, turmas,
              alocação horária e insights pedagógicos da unidade{" "}
              <strong className="font-semibold text-slate-700">
                {activeSchool.name}
              </strong>
              .
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/grade"
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nova Geração de Horário</span>
            </Link>
          </div>
        </header>

        {/* 2. Cards de Métricas Animados (Framer Motion Stagger Effect) */}
        <section aria-label="Indicadores Principais">
          <motion.div
            key={activeSchool.id}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Card 1: Total de Professores */}
            <motion.div variants={cardVariants}>
              <Link
                href="/professores"
                className="group h-full bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
                      Total de Professores
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-2 tracking-tight">
                      {teachersCount}
                    </h2>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {teachersCount > 0
                      ? "100% com matriz de disponibilidade"
                      : "Cadastre professores em /professores"}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
              </Link>
            </motion.div>

            {/* Card 2: Turmas Ativas */}
            <motion.div variants={cardVariants}>
              <Link
                href="/turmas"
                className="group h-full bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
                      Turmas Ativas
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-2 tracking-tight">
                      {classesCount}
                    </h2>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {activeSchool.educationModel || "Ensino Regular"} •{" "}
                    {totalWeeklyClasses} aulas/sem
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
              </Link>
            </motion.div>

            {/* Card 3: Choques de Horário (Alerta Crítico + Pulse Contínuo) */}
            <motion.div variants={cardVariants}>
              <Link
                href="/grade"
                className={`group h-full relative overflow-hidden rounded-xl p-6 border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  conflictsCount > 0
                    ? "bg-red-50/90 hover:bg-red-50 border-red-200/90 hover:border-red-300 hover:shadow-red-500/10 hover:-translate-y-1"
                    : "bg-white hover:bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:-translate-y-1"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-bold ${
                          conflictsCount > 0 ? "text-red-900" : "text-slate-700"
                        }`}
                      >
                        Choques de Horário
                      </p>
                      {conflictsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                          Crítico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Regular
                        </span>
                      )}
                    </div>
                    <h2
                      className={`text-4xl sm:text-5xl font-extrabold mt-2 tracking-tight ${
                        conflictsCount > 0
                          ? "text-red-800 animate-pulse"
                          : "text-slate-900"
                      }`}
                    >
                      {conflictsCount}
                    </h2>
                  </div>

                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-2xs ${
                      conflictsCount > 0
                        ? "bg-red-100 text-red-700 group-hover:bg-red-600 group-hover:text-white animate-pulse"
                        : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                    }`}
                  >
                    {conflictsCount > 0 ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                </div>

                <div
                  className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${
                    conflictsCount > 0
                      ? "border-red-200/80 text-red-800 font-semibold"
                      : "border-slate-100 text-slate-500"
                  }`}
                >
                  <span>
                    {conflictsCount === 0
                      ? "Nenhum choque de horário pendente"
                      : "Requer resolução imediata na grade"}
                  </span>
                  <ArrowUpRight
                    className={`w-4 h-4 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                      conflictsCount > 0 ? "text-red-700" : "text-slate-400"
                    }`}
                  />
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* 3. Painel de Gráficos Modernos (Recharts) */}
        <section aria-label="Análise Gráfica da Grade">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DailyWorkloadChart
              data={workload}
              schoolName={activeSchool.name}
            />
            <ScheduleAllocationChart
              allocatedPercent={allocatedPercent}
              totalClasses={totalWeeklyClasses}
            />
          </div>
        </section>

        {/* 4. Feed de Insights da IA ("Alertas e Insights do Motor") */}
        <section
          aria-label="Alertas e Insights do Motor"
          className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 transition-all duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Alertas e Insights do Motor
                </h3>
                <p className="text-xs text-slate-500">
                  Diagnósticos automáticos gerados pelo algoritmo de otimização
                  para{" "}
                  <strong className="text-slate-700">
                    {activeSchool.name}
                  </strong>
                </p>
              </div>
            </div>

            <Link
              href="/grade"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              <span>Ver matriz completa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4">
            {insights.length === 0 ? (
              <div className="py-4">
                <EmptyState
                  icon={Cpu}
                  title="Nenhum alerta ou conflito pendente"
                  description="Os diagnósticos e sugestões da IA aparecerão conforme os primeiros horários e regras forem gerados."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {insights.map((item) => {
                  const isAlert = item.type === "alerta";
                  const isSuggestion = item.type === "sugestao";

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group py-3.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-all duration-300 flex items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105 ${
                            isAlert
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : isSuggestion
                              ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                              : "bg-red-50 text-red-600 border-red-200"
                          }`}
                        >
                          {isAlert ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : isSuggestion ? (
                            <Lightbulb className="w-5 h-5" />
                          ) : (
                            <AlertOctagon className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {item.title}
                            </p>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isAlert
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : isSuggestion
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-red-50 text-red-800 border-red-200"
                              }`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {item.detail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 shrink-0 transition-all duration-300 group-hover:translate-x-1">
                        <span className="hidden md:inline">Resolver</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
