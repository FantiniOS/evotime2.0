"use client";

import React, { useState } from "react";
import Link from "next/link";
import type {
  UnfeasibleConflictItem,
  AIQuickActionSuggestion,
} from "@/lib/solver/jobStore";
import {
  AlertCircle,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  CalendarClock,
  ArrowRightLeft,
  ShieldCheck,
  X,
  ExternalLink,
  Bot,
} from "lucide-react";

interface InfeasibilityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReoptimizeWithFixes: (appliedActions: Record<string, string>) => void;
  title?: string;
  reason?: string;
  turma: string;
  jobId?: string;
  conflicts: UnfeasibleConflictItem[];
}

export default function InfeasibilityReportModal({
  isOpen,
  onClose,
  onReoptimizeWithFixes,
  title = "A Grade precisa de ajustes para ser finalizada",
  reason = "Nosso assistente identificou restrições que impedem o fechamento matemático de todos os períodos. Escolha uma sugestão da IA para cada ponto abaixo:",
  turma,
  jobId,
  conflicts,
}: InfeasibilityReportModalProps) {
  // Mapa conflict.id -> suggestion.id escolhida pelo coordenador
  const [selectedSuggestions, setSelectedSuggestions] = useState<
    Record<string, AIQuickActionSuggestion>
  >({});

  // Estado opcional de preview rápido de disponibilidade quando o coordenador clica em "Ver disponibilidade..."
  const [expandedAvailabilityId, setExpandedAvailabilityId] = useState<
    string | null
  >(null);

  if (!isOpen) return null;

  const resolvedCount = Object.keys(selectedSuggestions).length;
  const totalConflicts = conflicts.length;

  const handleSelectAction = (
    conflict: UnfeasibleConflictItem,
    suggestion: AIQuickActionSuggestion
  ) => {
    if (suggestion.actionType === "view_availability") {
      setExpandedAvailabilityId((prev) =>
        prev === conflict.id ? null : conflict.id
      );
    }

    setSelectedSuggestions((prev) => ({
      ...prev,
      [conflict.id]: suggestion,
    }));
  };

  const handleApplyAllRecommended = () => {
    const nextMap: Record<string, AIQuickActionSuggestion> = {};
    for (const conflict of conflicts) {
      const recommended =
        conflict.suggestions.find((s) => s.badge) ||
        conflict.suggestions.find((s) => s.actionType !== "view_availability") ||
        conflict.suggestions[0];
      if (recommended) {
        nextMap[conflict.id] = recommended;
      }
    }
    setSelectedSuggestions(nextMap);
  };

  const handleConfirmAndGenerate = () => {
    const summaryMap: Record<string, string> = {};
    for (const [conflictId, suggestion] of Object.entries(
      selectedSuggestions
    )) {
      summaryMap[conflictId] = suggestion.label;
    }
    onReoptimizeWithFixes(summaryMap);
  };

  const getSuggestionIcon = (
    actionType: AIQuickActionSuggestion["actionType"]
  ) => {
    switch (actionType) {
      case "view_availability":
        return <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" />;
      case "transfer_workload":
        return <ArrowRightLeft className="w-4 h-4 text-indigo-600 shrink-0" />;
      case "allow_exception":
        return <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="infeasibility-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-amber-200/80 shadow-2xl overflow-hidden">
        {/* Faixa Superior Sutil em Tons de Âmbar/Laranja */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-indigo-500" />

        {/* Cabeçalho Amigável do Modal */}
        <div className="px-6 py-5 bg-gradient-to-b from-amber-50/70 to-white border-b border-slate-200/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Ícone de Aviso Sutil em Laranja/Âmbar */}
            <div className="w-12 h-12 rounded-2xl bg-amber-100/90 border border-amber-200/90 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200 text-[11px] font-semibold text-amber-800">
                  <Bot className="w-3.5 h-3.5 text-amber-600" />
                  Assistente de Diagnóstico IA
                </span>
                <span className="text-xs font-medium text-slate-400">
                  • {turma}
                </span>
                {jobId && (
                  <code className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                    {jobId}
                  </code>
                )}
              </div>

              <h2
                id="infeasibility-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
              >
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                {reason}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de diagnóstico"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cabeçalho das Duas Colunas (Desktop) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 px-6 py-3 bg-slate-50/90 border-b border-slate-200/80 text-xs font-bold uppercase tracking-wider">
          <div className="col-span-6 flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Onde está o problema ({totalConflicts})</span>
          </div>
          <div className="col-span-6 flex items-center justify-between text-indigo-900">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Sugestões da IA (Quick Actions)</span>
            </div>
            <button
              type="button"
              onClick={handleApplyAllRecommended}
              className="text-[11px] font-semibold normal-case text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
            >
              Selecionar recomendações da IA
            </button>
          </div>
        </div>

        {/* Corpo Rolável: Lista Visual Dividida em Duas Colunas */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/40">
          {conflicts.map((conflict, index) => {
            const chosenSuggestion = selectedSuggestions[conflict.id];
            const isAvailabilityOpen = expandedAvailabilityId === conflict.id;

            return (
              <div
                key={conflict.id}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 rounded-2xl border transition-all duration-200 ${
                  chosenSuggestion
                    ? "bg-white border-emerald-200/90 shadow-xs"
                    : "bg-white border-slate-200/90 shadow-xs hover:border-amber-200"
                }`}
              >
                {/* COLUNA DA ESQUERDA: ONDE ESTÁ O PROBLEMA */}
                <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-amber-50/45 border border-amber-200/75 p-4">
                  <div className="space-y-2.5">
                    {/* Cabeçalho Mobile da Coluna */}
                    <div className="flex lg:hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Onde está o problema</span>
                    </div>

                    {/* Badges de Gargalo e Turma */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 text-amber-900 border border-amber-200/80 text-[11px] font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        {conflict.bottleneckLabel}
                      </span>

                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                        Gargalo #{index + 1} • {conflict.targetClass}
                      </span>
                    </div>

                    {/* Frase Principal do Gargalo */}
                    <p className="text-sm font-bold text-slate-900 leading-snug pt-0.5">
                      {conflict.message}
                    </p>

                    {/* Explicação complementar */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {conflict.detail}
                    </p>

                    {/* Preview Rápido da Disponibilidade (quando o usuário clica em "Ver disponibilidade...") */}
                    {isAvailabilityOpen && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-amber-200/90 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800">
                            Resumo de Disponibilidade • {conflict.teacherName}
                          </span>
                          <Link
                            href="/professores"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            <span>Abrir Matriz Completa</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Dias sugeridos para abertura de períodos:{" "}
                          <strong className="text-amber-800">
                            {conflict.suggestedDay}
                          </strong>{" "}
                          (libera os{" "}
                          <strong>{conflict.deficitSlots} períodos</strong>{" "}
                          restantes para {conflict.subject}).
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card de Problema */}
                  <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span>
                      Docente: <strong>{conflict.teacherName}</strong> (
                      {conflict.subject})
                    </span>
                    {chosenSuggestion ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Ajuste Selecionado
                      </span>
                    ) : (
                      <span className="text-amber-800 font-semibold">
                        Déficit: {conflict.deficitSlots} aula(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* COLUNA DA DIREITA: SUGESTÕES DA IA (QUICK ACTIONS) */}
                <div className="lg:col-span-6 flex flex-col justify-between space-y-2.5">
                  <div className="flex lg:hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sugestões da IA</span>
                  </div>

                  <div className="space-y-2.5">
                    {conflict.suggestions.map((suggestion) => {
                      const isSelected =
                        chosenSuggestion?.id === suggestion.id;

                      return (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() =>
                            handleSelectAction(conflict, suggestion)
                          }
                          className={`group w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500/15 shadow-2xs"
                              : "bg-slate-50/70 hover:bg-indigo-50/40 border-slate-200/90 hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-xs"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-amber-500 border-slate-200/90 group-hover:border-indigo-200"
                              }`}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-white" />
                              ) : (
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-xs sm:text-sm font-semibold leading-snug ${
                                    isSelected
                                      ? "text-indigo-950"
                                      : "text-slate-800 group-hover:text-indigo-950"
                                  }`}
                                >
                                  {suggestion.label}
                                </span>
                                {suggestion.badge && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    {suggestion.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {getSuggestionIcon(suggestion.actionType)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé do Assistente IA */}
        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>{resolvedCount}</strong> de{" "}
              <strong>{totalConflicts}</strong> gargalos com ação corretiva
              selecionada
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Revisar Grade Manualmente
            </button>

            <button
              type="button"
              onClick={handleConfirmAndGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {resolvedCount > 0
                  ? `Aplicar ${resolvedCount} Ajuste(s) e Finalizar Grade`
                  : "Aplicar Sugestões da IA e Finalizar Grade"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
