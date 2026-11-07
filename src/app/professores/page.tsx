"use client";

import React, { useState, useEffect, useTransition } from "react";
import Topbar from "@/components/Topbar";
import EmptyState from "@/components/EmptyState";
import {
  listarProfessores,
  salvarProfessor,
  excluirProfessor,
} from "@/actions/professorActions";
import { toast } from "sonner";
import {
  DEFAULT_SUBJECTS,
  DEFAULT_CLASSES,
  SUBJECTS_STORAGE_KEY,
  CLASSES_STORAGE_KEY,
  TEACHERS_STORAGE_KEY,
  SubjectItem,
  SchoolClassItem,
  getColorOption,
} from "@/lib/schoolData";
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Sliders,
  Calendar,
  Save,
  Sparkles,
  RotateCcw,
  Link2,
  Check,
  X,
  Loader2,
} from "lucide-react";

export type DayKey = "seg" | "ter" | "qua" | "qui" | "sex";

export interface PeriodRow {
  id: string;
  label: string;
  time: string;
}

export interface AllocationRules {
  avoidGaps: boolean;
  avoidMoreThanTwoConsecutive: boolean;
}

export interface WorkloadAssignment {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  colorId: string;
  classNames: string[];
}

export interface TeacherEngineProfile {
  id: string;
  name: string;
  assignments: WorkloadAssignment[];
  unavailableSlots: string[];
  rules: AllocationRules;
}

const DAYS: { key: DayKey; short: string; label: string }[] = [
  { key: "seg", short: "Seg", label: "Segunda" },
  { key: "ter", short: "Ter", label: "Terça" },
  { key: "qua", short: "Qua", label: "Quarta" },
  { key: "qui", short: "Qui", label: "Quinta" },
  { key: "sex", short: "Sex", label: "Sexta" },
];

const PERIODS: PeriodRow[] = [
  { id: "p1", label: "1º Período", time: "07:00 - 07:50" },
  { id: "p2", label: "2º Período", time: "07:50 - 08:40" },
  { id: "p3", label: "3º Período", time: "08:40 - 09:30" },
  { id: "p4", label: "4º Período", time: "09:50 - 10:40" },
  { id: "p5", label: "5º Período", time: "10:40 - 11:30" },
  { id: "p6", label: "6º Período", time: "11:30 - 12:20" },
];

const TOTAL_SLOTS = DAYS.length * PERIODS.length;

const INITIAL_TEACHERS: TeacherEngineProfile[] = [];

export default function ProfessoresPage() {
  const [teachers, setTeachers] = useState<TeacherEngineProfile[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<SchoolClassItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado do Formulário (Coluna da Direita)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("");
  const [assignments, setAssignments] = useState<WorkloadAssignment[]>([]);
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
  const [rules, setRules] = useState<AllocationRules>({
    avoidGaps: true,
    avoidMoreThanTwoConsecutive: true,
  });

  // Estado do Bloco de Associação Dinâmico ("Atribuição de Carga Horária")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedClassNames, setSelectedClassNames] = useState<string[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        const savedSub = localStorage.getItem(SUBJECTS_STORAGE_KEY);
        if (savedSub) {
          const parsed = JSON.parse(savedSub);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubjects(parsed);
            setSelectedSubjectId(parsed[0].id);
          }
        }

        const savedCls = localStorage.getItem(CLASSES_STORAGE_KEY);
        if (savedCls) {
          const parsed = JSON.parse(savedCls);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClasses(parsed);
            setSelectedClassNames([parsed[0].name]);
          }
        }

        // Busca professores no Supabase com fallback para localStorage
        const resProf = await listarProfessores();
        if (resProf.success && resProf.data && resProf.data.length > 0) {
          const mapped: TeacherEngineProfile[] = resProf.data.map((p) => ({
            id: p.id,
            name: p.nome,
            assignments: Array.isArray(p.vinculos) ? p.vinculos : [],
            unavailableSlots: Array.isArray(p.indisponibilidades)
              ? p.indisponibilidades
              : [],
            rules:
              p.regras && typeof p.regras === "object"
                ? (p.regras as any)
                : {
                    avoidGaps: true,
                    avoidMoreThanTwoConsecutive: true,
                  },
          }));
          setTeachers(mapped);
          try {
            localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
          return;
        }

        const savedTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
        if (savedTeachers) {
          const parsed = JSON.parse(savedTeachers);
          if (Array.isArray(parsed)) {
            setTeachers(parsed);
          }
        }
      } catch {
        // Fallback silencioso
      } finally {
        setIsLoaded(true);
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
    } catch {
      // Ignora erro
    }
  }, [teachers, isLoaded]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleStartNew = () => {
    setEditingId(null);
    setTeacherName("");
    setAssignments([]);
    setUnavailableSlots([]);
    setRules({
      avoidGaps: true,
      avoidMoreThanTwoConsecutive: true,
    });
  };

  const handleSelectEdit = (teacher: TeacherEngineProfile) => {
    setEditingId(teacher.id);
    setTeacherName(teacher.name);
    setAssignments(teacher.assignments || []);
    setUnavailableSlots(teacher.unavailableSlots || []);
    setRules({ ...teacher.rules });
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o professor "${name}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await excluirProfessor(id);
      if (res.success) {
        setTeachers((prev) => (prev || []).filter((t) => t.id !== id));
        if (editingId === id) {
          handleStartNew();
        }
        showToast(`Professor "${name}" removido com sucesso.`);
        toast.success(`Professor "${name}" removido.`);
      } else {
        toast.error(res.error || "Não foi possível excluir o professor.");
      }
    });
  };

  // Alternar seleção de turma no multi-select de tags/chips
  const toggleClassChip = (clsName: string) => {
    setSelectedClassNames((prev) =>
      prev.includes(clsName)
        ? prev.filter((c) => c !== clsName)
        : [...prev, clsName]
    );
  };

  // Adicionar Novo Vínculo (Disciplina + Múltiplas Turmas)
  const handleAddAssignment = () => {
    const sub = subjects.find((s) => s.id === selectedSubjectId);
    if (!sub || selectedClassNames.length === 0) return;

    setAssignments((prev) => {
      const existingIndex = prev.findIndex((a) => a.subjectId === sub.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const mergedClasses = Array.from(
          new Set([...updated[existingIndex].classNames, ...selectedClassNames])
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          classNames: mergedClasses,
        };
        return updated;
      }

      return [
        ...prev,
        {
          id: `vinc-${Date.now()}`,
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          colorId: sub.colorId,
          classNames: [...selectedClassNames],
        },
      ];
    });
  };

  const handleRemoveAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  // Alternar horário na Matriz de Disponibilidade
  const toggleSlot = (dayKey: DayKey, periodId: string) => {
    const slotKey = `${dayKey}-${periodId}`;
    setUnavailableSlots((prev) =>
      prev.includes(slotKey)
        ? prev.filter((s) => s !== slotKey)
        : [...prev, slotKey]
    );
  };

  // Alternar dia inteiro na Matriz de Disponibilidade
  const toggleEntireDay = (dayKey: DayKey) => {
    const daySlotKeys = PERIODS.map((p) => `${dayKey}-${p.id}`);
    const isAllUnavailable = daySlotKeys.every((k) =>
      unavailableSlots.includes(k)
    );

    if (isAllUnavailable) {
      setUnavailableSlots((prev) =>
        prev.filter((s) => !daySlotKeys.includes(s))
      );
    } else {
      setUnavailableSlots((prev) => {
        const filtered = prev.filter((s) => !daySlotKeys.includes(s));
        return [...filtered, ...daySlotKeys];
      });
    }
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = teacherName.trim();
    if (!trimmedName) {
      toast.error("Informe o nome do professor.");
      return;
    }

    const cleanPayload = {
      id: editingId && !editingId.startsWith("prof-") ? editingId : undefined,
      nome: trimmedName,
      vinculos: (assignments || []).map((v) => ({
        id: v.id,
        subjectId: v.subjectId,
        subjectName: v.subjectName,
        subjectCode: v.subjectCode,
        colorId: v.colorId,
        classNames: Array.from(v.classNames || []),
      })),
      indisponibilidades: Array.from(unavailableSlots || []),
      regras: {
        avoidGaps: Boolean(rules.avoidGaps),
        avoidMoreThanTwoConsecutive: Boolean(rules.avoidMoreThanTwoConsecutive),
      },
    };

    startTransition(async () => {
      const res = await salvarProfessor(cleanPayload);
      if (res.success) {
        const generatedId = res.data?.id || editingId || `prof-${Date.now()}`;
        const localItem: TeacherEngineProfile = {
          id: generatedId,
          name: trimmedName,
          assignments,
          unavailableSlots,
          rules,
        };

        if (editingId) {
          setTeachers((prev) =>
            (prev || []).map((t) => (t.id === editingId ? localItem : t))
          );
          showToast(`Vínculos e disponibilidade de "${trimmedName}" salvos!`);
          toast.success(`Professor "${trimmedName}" atualizado com sucesso.`);
        } else {
          setTeachers((prev) => [localItem, ...(prev || [])]);
          showToast(`Professor "${trimmedName}" cadastrado com sucesso!`);
          toast.success(`Professor "${trimmedName}" cadastrado com sucesso.`);
        }

        handleStartNew();
      } else {
        toast.error(res.error || "Erro ao salvar professor no banco.");
      }
    });
  };

  const getFullDaysOffLabels = (slots: string[]) => {
    return DAYS.filter((d) =>
      PERIODS.every((p) => slots.includes(`${d.key}-${p.id}`))
    ).map((d) => d.short);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col">
      <Topbar />

      <main className="w-full max-w-7xl mx-auto px-4 py-4 h-[calc(100vh-70px)] flex flex-col overflow-hidden gap-4">
        {/* Cabeçalho Compacto */}
        <header className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-600 mb-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Painel de Vínculo e Alocação • Motor de Horários</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Cadastro de Professores
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Vincule disciplinas e turmas a cada professor, defina a matriz de
              disponibilidade e ajuste as regras de alocação.
            </p>
          </div>

          {feedbackMessage && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </header>

        {/* Layout de Duas Colunas (flex-1 overflow-hidden) */}
        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUNA DA ESQUERDA: Lista de Professores com Scroll Interno Invisível */}
          <section
            aria-label="Lista de Professores Cadastrados"
            className="lg:col-span-4 h-full min-h-0 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Professores ({teachers.length})
                </h2>
              </div>

              <button
                type="button"
                onClick={handleStartNew}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo</span>
              </button>
            </div>

            {teachers.length === 0 ? (
              <div className="flex-1 min-h-0 flex items-center justify-center p-2">
                <EmptyState
                  icon={Users}
                  title="Nenhum professor cadastrado ainda"
                  description="Clique em '+ Novo Professor' para começar."
                  actionButton={
                    <button
                      type="button"
                      onClick={handleStartNew}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Novo Professor</span>
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="h-full flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] space-y-2.5 pt-3">
                {(teachers || []).map((teacher) => {
                  const isSelected = editingId === teacher.id;
                  const availableCount =
                    TOTAL_SLOTS - (teacher?.unavailableSlots?.length || 0);
                  const fullDaysOff = getFullDaysOffLabels(
                    teacher?.unavailableSlots || []
                  );

                  return (
                    <div
                      key={teacher.id}
                      onClick={() => handleSelectEdit(teacher)}
                      className={`group p-3.5 rounded-xl border transition-all duration-200 cursor-pointer space-y-2 ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-300 shadow-xs"
                          : "bg-slate-50/60 hover:bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-bold truncate ${
                              isSelected ? "text-indigo-950" : "text-slate-800"
                            }`}
                          >
                            {teacher.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              {availableCount}/{TOTAL_SLOTS} livres
                            </span>

                            {fullDaysOff.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                Folga: {fullDaysOff.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectEdit(teacher)}
                            title="Editar professor"
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            }`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteTeacher(teacher.id, teacher.name)
                            }
                            title="Apagar professor"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Resumo dos Vínculos (Disciplina -> Turmas) */}
                      {teacher.assignments && teacher.assignments.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                          {(teacher.assignments || []).map((vinc) => {
                            const color = getColorOption(vinc.colorId);
                            return (
                              <div
                                key={vinc.id}
                                className="flex flex-wrap items-center gap-1.5 text-[11px]"
                              >
                                <span
                                  className={`px-1.5 py-0.5 rounded font-extrabold border text-[10px] ${color.bgClass} ${color.borderClass} ${color.textClass}`}
                                >
                                  {vinc.subjectCode}
                                </span>
                                <span className="text-slate-600 font-medium">
                                  {vinc.classNames.join(", ")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* COLUNA DA DIREITA: Painel do Formulário com Scroll Interno Invisível e Rodapé Sticky */}
          <section
            aria-label="Formulário de Cadastro e Vínculo do Professor"
            className="lg:col-span-8 h-full min-h-0 bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] relative"
          >
            <form
              onSubmit={handleSaveTeacher}
              className="flex flex-col min-h-full justify-between"
            >
              <div className="p-6 space-y-5">
                {/* Cabeçalho do Formulário */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {editingId
                        ? "Editar Professor e Vínculos"
                        : "Novo Cadastro de Professor"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Associe o professor às disciplinas e turmas, bloqueie
                      horários de folga e defina as restrições.
                    </p>
                  </div>

                  {editingId && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      Modo de Edição Ativo
                    </span>
                  )}
                </div>

                {/* 1. Nome do Professor */}
                <div>
                  <label
                    htmlFor="teacher-name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Nome do Professor
                  </label>
                  <input
                    id="teacher-name"
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Ex: Prof. Ricardo Almeida"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                {/* 2. Atribuição de Carga Horária (Disciplina + Multi-select Turmas) */}
                <div className="space-y-3 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Atribuição de Carga Horária
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600">
                      Elo Disciplina ↔ Turmas
                    </span>
                  </div>

                  {/* Bloco de Associação Dinâmico */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    {/* Selecionar Disciplina */}
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Disciplina Lecionada
                      </label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {subjects.length === 0 ? (
                          <option value="">Nenhuma disciplina cadastrada</option>
                        ) : (
                          (subjects || []).map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} ({sub.code})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Multi-select de Turmas em formato de Tags/Chips */}
                    <div className="md:col-span-8 space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Turmas em que leciona esta matéria (Multi-select)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {classes.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Nenhuma turma cadastrada. Cadastre turmas em /turmas.
                          </p>
                        ) : (
                          (classes || []).map((cls) => {
                            const isChecked = selectedClassNames.includes(
                              cls.name
                            );
                            return (
                              <button
                                key={cls.id}
                                type="button"
                                onClick={() => toggleClassChip(cls.name)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none ${
                                  isChecked
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                                }`}
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                    isChecked
                                      ? "bg-white text-indigo-600 border-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isChecked && (
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  )}
                                </span>
                                <span>{cls.name}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Botão "+ Adicionar Novo Vínculo" */}
                    <div className="md:col-span-12 pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddAssignment}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Adicionar Novo Vínculo</span>
                      </button>
                    </div>
                  </div>

                  {/* Cards Minimalistas Empilhados dos Vínculos Adicionados */}
                  <div className="space-y-1.5">
                    {assignments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-1">
                        Nenhum vínculo adicionado ainda. Selecione uma
                        disciplina e as turmas acima e clique em &ldquo;+
                        Adicionar Novo Vínculo&rdquo;.
                      </p>
                    ) : (
                      (assignments || []).map((vinc) => {
                        const color = getColorOption(vinc.colorId);
                        return (
                          <div
                            key={vinc.id}
                            className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${color.bgClass} ${color.borderClass} ${color.textClass}`}
                              >
                                {vinc.subjectName} ({vinc.subjectCode})
                              </span>
                              <span className="text-xs text-slate-400">→</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {(vinc?.classNames || []).map((cn) => (
                                  <span
                                    key={cn}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80"
                                  >
                                    {cn}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(vinc.id)}
                              title="Remover vínculo"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Seção: Matriz de Disponibilidade (Compactada com gap-1.5 e botões p-1.5) */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Matriz de Disponibilidade
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Clique nos blocos para alternar entre{" "}
                        <strong className="text-emerald-700">Disponível</strong>{" "}
                        e{" "}
                        <strong className="text-rose-700">Indisponível</strong>{" "}
                        (ou no nome do dia para bloquear o dia inteiro).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-semibold shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Disponível
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Indisponível
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/60 p-2">
                    <div className="overflow-x-auto">
                      <div className="min-w-[540px] space-y-1.5">
                        {/* Cabeçalho dos Dias da Semana */}
                        <div className="grid grid-cols-[110px_repeat(5,minmax(0,1fr))] gap-1.5">
                          <div className="px-2 py-1.5 rounded-lg bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center">
                            Períodos
                          </div>
                          {DAYS.map((day) => {
                            const isFullDayBlocked = PERIODS.every((p) =>
                              unavailableSlots.includes(`${day.key}-${p.id}`)
                            );

                            return (
                              <button
                                key={day.key}
                                type="button"
                                onClick={() => toggleEntireDay(day.key)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200/80 text-center hover:bg-slate-100/80 transition-colors group cursor-pointer"
                              >
                                <span className="block text-xs font-bold text-slate-800 group-hover:text-indigo-600 leading-none">
                                  {day.label}
                                </span>
                                <span
                                  className={`block text-[10px] font-semibold mt-0.5 leading-none ${
                                    isFullDayBlocked
                                      ? "text-rose-600"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {isFullDayBlocked
                                    ? "Dia de Folga"
                                    : "Alternar dia"}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Linhas Compactas dos Períodos (gap-1.5 e botões p-1.5) */}
                        <div className="space-y-1">
                          {PERIODS.map((period) => (
                            <div
                              key={period.id}
                              className="grid grid-cols-[110px_repeat(5,minmax(0,1fr))] gap-1.5 items-center"
                            >
                              <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/70 flex flex-col justify-center">
                                <span className="text-[11px] font-bold text-slate-800 leading-tight">
                                  {period.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium leading-tight">
                                  {period.time}
                                </span>
                              </div>

                              {DAYS.map((day) => {
                                const slotKey = `${day.key}-${period.id}`;
                                const isUnavailable =
                                  unavailableSlots.includes(slotKey);

                                return (
                                  <button
                                    key={day.key}
                                    type="button"
                                    onClick={() =>
                                      toggleSlot(day.key, period.id)
                                    }
                                    className={`w-full p-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 flex items-center justify-center gap-1 select-none active:scale-[0.98] cursor-pointer ${
                                      isUnavailable
                                        ? "bg-rose-50/90 hover:bg-rose-100/80 border-rose-200 text-rose-700"
                                        : "bg-emerald-50/90 hover:bg-emerald-100/80 border-emerald-200 text-emerald-700"
                                    }`}
                                  >
                                    {isUnavailable ? (
                                      <>
                                        <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                        <span>Indisponível</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>Disponível</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Seção: Regras de Alocação */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Regras de Alocação
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() =>
                        setRules((prev) => ({
                          ...prev,
                          avoidGaps: !prev.avoidGaps,
                        }))
                      }
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        rules.avoidGaps
                          ? "bg-indigo-50/40 border-indigo-200"
                          : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Evitar janelas/horários vagos no meio do turno
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Agrupa as aulas do professor de forma contínua.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={rules.avoidGaps}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRules((prev) => ({
                            ...prev,
                            avoidGaps: !prev.avoidGaps,
                          }));
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          rules.avoidGaps ? "bg-indigo-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            rules.avoidGaps ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div
                      onClick={() =>
                        setRules((prev) => ({
                          ...prev,
                          avoidMoreThanTwoConsecutive:
                            !prev.avoidMoreThanTwoConsecutive,
                        }))
                      }
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        rules.avoidMoreThanTwoConsecutive
                          ? "bg-indigo-50/40 border-indigo-200"
                          : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Evitar mais de 2 aulas consecutivas
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Impede triplas ou blocos exaustivos na mesma turma.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={rules.avoidMoreThanTwoConsecutive}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRules((prev) => ({
                            ...prev,
                            avoidMoreThanTwoConsecutive:
                              !prev.avoidMoreThanTwoConsecutive,
                          }));
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          rules.avoidMoreThanTwoConsecutive
                            ? "bg-indigo-600"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            rules.avoidMoreThanTwoConsecutive
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Rodapé Fixo (sticky bottom-0 bg-white border-t p-4) */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200/90 p-4 z-10 flex items-center justify-end gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar Edição
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gravando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Professor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
