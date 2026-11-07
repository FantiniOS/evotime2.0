"use client";

import React, { useState, useEffect, useTransition } from "react";
import EmptyState from "@/components/EmptyState";
import {
  PASTEL_COLORS,
  DEFAULT_SUBJECTS,
  SUBJECTS_STORAGE_KEY,
  SubjectItem,
  getColorOption,
} from "@/lib/schoolData";
import {
  listarDisciplinas,
  salvarDisciplina,
  excluirDisciplina,
} from "@/actions/disciplinaActions";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Check,
  Palette,
  Save,
  CheckCircle2,
  Loader2,
} from "lucide-react";

type ListarDisciplinasResult = Awaited<ReturnType<typeof listarDisciplinas>>;

interface DisciplinasClientProps {
  /** Dados pré-carregados no Server Component (evita round-trip extra após a hidratação). */
  initialDisciplinas?: ListarDisciplinasResult;
}

export default function DisciplinasClient({
  initialDisciplinas,
}: DisciplinasClientProps) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado do Formulário (Coluna da Direita)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string>("");
  const [subjectCode, setSubjectCode] = useState<string>("");
  const [selectedColorId, setSelectedColorId] = useState<string>("blue");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Carregar do Supabase com fallback para localStorage
  useEffect(() => {
    async function carregarDisciplinas() {
      try {
        const res = initialDisciplinas ?? (await listarDisciplinas());
        if (res.success && res.data && res.data.length > 0) {
          const mapped: SubjectItem[] = res.data.map((d) => ({
            id: d.id,
            name: d.nome,
            code: d.codigo,
            colorId: d.cor_id,
          }));
          setSubjects(mapped);
          try {
            localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
          setIsLoaded(true);
          return;
        }

        const saved = localStorage.getItem(SUBJECTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubjects(parsed);
          } else {
            setSubjects(DEFAULT_SUBJECTS);
          }
        } else {
          setSubjects(DEFAULT_SUBJECTS);
        }
      } catch {
        setSubjects(DEFAULT_SUBJECTS);
      } finally {
        setIsLoaded(true);
      }
    }

    carregarDisciplinas();
  }, []);

  // Salvar no localStorage para persistência offline
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects));
    } catch {
      // Ignora erro de quota
    }
  }, [subjects, isLoaded]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Iniciar Nova Disciplina
  const handleStartNew = () => {
    setEditingId(null);
    setSubjectName("");
    setSubjectCode("");
    setSelectedColorId("blue");
  };

  // Selecionar Disciplina para Edição
  const handleSelectEdit = (sub: SubjectItem) => {
    setEditingId(sub.id);
    setSubjectName(sub.name);
    setSubjectCode(sub.code);
    setSelectedColorId(sub.colorId);
  };

  // Apagar Disciplina via Server Action (passando apenas string ID)
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover a disciplina "${name}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await excluirDisciplina(id);
      if (res.success) {
        setSubjects((prev) => (prev || []).filter((s) => s.id !== id));
        if (editingId === id) {
          handleStartNew();
        }
        showToast(`Disciplina "${name}" removida com sucesso.`);
        toast.success(`Disciplina "${name}" removida.`);
      } else {
        toast.error(res.error || "Não foi possível excluir a disciplina.");
      }
    });
  };

  // Salvar Disciplina: intercepta evento do form e passa APENAS JSON limpo serializável
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = subjectName.trim();
    const trimmedCode =
      subjectCode.trim().toUpperCase() ||
      trimmedName.slice(0, 3).toUpperCase();

    if (!trimmedName) {
      toast.error("Informe o nome da disciplina.");
      return;
    }

    // Objeto limpo serializável para a Server Action
    const cleanPayload = {
      id: editingId && !editingId.startsWith("sub-") ? editingId : undefined,
      nome: trimmedName,
      codigo: trimmedCode,
      cor_id: selectedColorId,
    };

    startTransition(async () => {
      const res = await salvarDisciplina(cleanPayload);
      if (res.success) {
        const generatedId = res.data?.id || editingId || `sub-${Date.now()}`;
        const localItem: SubjectItem = {
          id: generatedId,
          name: trimmedName,
          code: trimmedCode,
          colorId: selectedColorId,
        };

        if (editingId) {
          setSubjects((prev) =>
            (prev || []).map((s) => (s.id === editingId ? localItem : s))
          );
          showToast(`Disciplina "${trimmedName}" atualizada!`);
          toast.success(`Disciplina "${trimmedName}" atualizada.`);
        } else {
          setSubjects((prev) => [localItem, ...(prev || [])]);
          showToast(`Disciplina "${trimmedName}" cadastrada!`);
          toast.success(`Disciplina "${trimmedName}" cadastrada.`);
        }

        handleStartNew();
      } else {
        toast.error(res.error || "Erro ao salvar disciplina no banco.");
      }
    });
  };

  const previewColor = getColorOption(selectedColorId);

  return (
    <div className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
      {/* Estrutura Base */}
      <main className="w-full max-w-7xl mx-auto px-4 py-4 h-[calc(100vh-70px)] overflow-hidden flex flex-col gap-4">
        {/* Cabeçalho de Página Compacto */}
        <header className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-600 mb-1.5 shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Catálogo Curricular • Identidade Visual na Grade</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gestão de Disciplinas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Cadastre as matérias escolares, defina suas siglas e escolha a cor
              pastel de destaque na grade de horários.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {feedbackMessage && (
              <div className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartNew}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Disciplina</span>
            </button>
          </div>
        </header>

        {/* Layout de Grade: Duas Colunas */}
        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUNA DA ESQUERDA: Disciplinas Cadastradas */}
          <section
            aria-label="Disciplinas Cadastradas"
            className="lg:col-span-5 h-full min-h-0 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Disciplinas Cadastradas ({(subjects || []).length})
                </h2>
              </div>
            </div>

            {(subjects || []).length === 0 ? (
              <div className="flex-1 min-h-0 flex items-center justify-center p-2">
                <EmptyState
                  icon={BookOpen}
                  title="Nenhuma disciplina cadastrada ainda"
                  description="Cadastre sua primeira matéria usando o formulário ao lado."
                />
              </div>
            ) : (
              <div className="h-full flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] space-y-2.5 pt-3">
                {(subjects || []).map((sub) => {
                  const color = getColorOption(sub.colorId);
                  const isSelected = editingId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectEdit(sub)}
                      className={`group p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-indigo-50/60 border-indigo-300 shadow-xs"
                          : "bg-slate-50/50 hover:bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Badge Pastel com a Abreviação */}
                        <div
                          className={`w-12 h-10 rounded-lg border flex items-center justify-center text-xs font-extrabold tracking-wider shrink-0 ${color.bgClass} ${color.borderClass} ${color.textClass}`}
                        >
                          {sub.code}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {sub.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full ${color.dotClass}`}
                            />
                            <span className="text-[11px] font-medium text-slate-500">
                              {color.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações: Editar e Apagar */}
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectEdit(sub)}
                          title="Editar disciplina"
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
                          onClick={() => handleDelete(sub.id, sub.name)}
                          disabled={isPending}
                          title="Apagar disciplina"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* COLUNA DA DIREITA: Formulário */}
          <section
            aria-label="Formulário de Cadastro de Disciplina"
            className="lg:col-span-7 h-full min-h-0 overflow-hidden flex flex-col justify-center"
          >
            <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 overflow-hidden">
              <form onSubmit={handleSave} className="space-y-4">
                {/* Cabeçalho do Formulário */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {editingId ? "Editar Disciplina" : "Cadastrar Disciplina"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Defina o nome, a sigla e a cor de identificação nos blocos
                      da grade.
                    </p>
                  </div>

                  {editingId && (
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      Editando
                    </span>
                  )}
                </div>

                {/* Inputs Base: Nome da Disciplina e Abreviação */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="subject-name"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Nome da Disciplina
                    </label>
                    <input
                      id="subject-name"
                      type="text"
                      required
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Ex: Matemática"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject-code"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Abreviação
                    </label>
                    <input
                      id="subject-code"
                      type="text"
                      required
                      maxLength={5}
                      value={subjectCode}
                      onChange={(e) =>
                        setSubjectCode(e.target.value.toUpperCase())
                      }
                      placeholder="Ex: MAT"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Seletor Visual de Cor */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-600" />
                      <span>Cor de Destaque na Grade</span>
                    </label>
                    <span className="text-xs font-semibold text-slate-500">
                      Selecionada:{" "}
                      <strong className="text-slate-800">
                        {previewColor.label}
                      </strong>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 justify-items-center">
                      {PASTEL_COLORS.map((color) => {
                        const isSelected = selectedColorId === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setSelectedColorId(color.id)}
                            title={color.label}
                            aria-label={color.label}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                              color.bgClass
                            } ${color.borderClass} ${
                              isSelected
                                ? `ring-2 ring-offset-2 ${color.ringClass} scale-110 shadow-sm`
                                : "hover:scale-105 opacity-85 hover:opacity-100"
                            }`}
                          >
                            {isSelected && (
                              <Check
                                className={`w-4 h-4 stroke-[2.5] ${color.textClass}`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview do Bloco na Grade Final */}
                  <div className="pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Pré-visualização do cartão na Grade de Horários:
                    </p>
                    <div
                      className={`p-3 rounded-xl border shadow-2xs flex items-center justify-between ${previewColor.bgClass} ${previewColor.borderClass}`}
                    >
                      <div>
                        <span
                          className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70 ${previewColor.textClass}`}
                        >
                          {subjectCode || "MAT"}
                        </span>
                        <p
                          className={`text-sm font-bold mt-0.5 ${previewColor.textClass}`}
                        >
                          {subjectName || "Matemática"}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold opacity-80 ${previewColor.textClass}`}
                      >
                        1ª Aula • Período Regular
                      </span>
                    </div>
                  </div>
                </div>

                {/* Finalização: Botão Salvar Disciplina */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleStartNew}
                      disabled={isPending}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancelar
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
                        <span>Salvar Disciplina</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
