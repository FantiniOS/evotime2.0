"use client";

import React, { useState, useEffect, useMemo } from "react";
import Topbar from "@/components/Topbar";
import EmptyState from "@/components/EmptyState";
import {
  DEFAULT_SUBJECTS,
  DEFAULT_CLASSES,
  SUBJECTS_STORAGE_KEY,
  CLASSES_STORAGE_KEY,
  SubjectItem,
  SchoolClassItem,
  CurriculumItem,
  getColorOption,
} from "@/lib/schoolData";
import {
  GraduationCap,
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Save,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  RotateCcw,
} from "lucide-react";

type ShiftType = "Matutino" | "Vespertino" | "Noturno" | "Integral";

export default function TurmasPage() {
  const [classes, setClasses] = useState<SchoolClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Estado do Formulário (Coluna da Direita)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [className, setClassName] = useState<string>("");
  const [shift, setShift] = useState<ShiftType>("Matutino");
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);

  // Controles de adição na Matriz Curricular
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [weeklyClassesCount, setWeeklyClassesCount] = useState<number>(4);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedSubjects = localStorage.getItem(SUBJECTS_STORAGE_KEY);
      if (savedSubjects) {
        const parsedSub = JSON.parse(savedSubjects);
        if (Array.isArray(parsedSub) && parsedSub.length > 0) {
          setSubjects(parsedSub);
          setSelectedSubjectId(parsedSub[0].id);
        }
      }

      const savedClasses = localStorage.getItem(CLASSES_STORAGE_KEY);
      if (savedClasses) {
        const parsedCls = JSON.parse(savedClasses);
        if (Array.isArray(parsedCls)) {
          setClasses(parsedCls);
        }
      } else {
        setClasses([]);
      }
    } catch {
      setClasses([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes));
    } catch {
      // Ignora erro de quota
    }
  }, [classes, isLoaded]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleStartNew = () => {
    setEditingId(null);
    setClassName("");
    setShift("Matutino");
    setCurriculum([]);
    setWeeklyClassesCount(4);
  };

  const handleSelectEdit = (item: SchoolClassItem) => {
    setEditingId(item.id);
    setClassName(item.name);
    setShift(item.shift);
    setCurriculum([...item.curriculum]);
  };

  const handleDeleteClass = (id: string, name: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) {
      handleStartNew();
    }
    showToast(`Turma "${name}" removida.`);
  };

  // Adicionar Disciplina à Matriz Curricular
  const handleAddCurriculumItem = () => {
    const subjectObj = subjects.find((s) => s.id === selectedSubjectId);
    if (!subjectObj || weeklyClassesCount <= 0) return;

    setCurriculum((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.subjectId === subjectObj.id
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          weeklyClasses: Number(weeklyClassesCount),
        };
        return updated;
      }

      return [
        ...prev,
        {
          subjectId: subjectObj.id,
          subjectName: subjectObj.name,
          subjectCode: subjectObj.code,
          colorId: subjectObj.colorId,
          weeklyClasses: Number(weeklyClassesCount),
        },
      ];
    });
  };

  const handleRemoveCurriculumItem = (subjectId: string) => {
    setCurriculum((prev) => prev.filter((i) => i.subjectId !== subjectId));
  };

  const totalWeeklyClasses = useMemo(
    () => curriculum.reduce((acc, item) => acc + item.weeklyClasses, 0),
    [curriculum]
  );

  // Limite lógico: 25 aulas para turno único (Matutino, Vespertino, Noturno) ou 45 para Integral
  const maxRecommendedClasses = shift === "Integral" ? 45 : 25;
  const isOverLimit = totalWeeklyClasses > maxRecommendedClasses;

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = className.trim();
    if (!trimmedName) return;

    const payload: SchoolClassItem = {
      id: editingId || `turma-${Date.now()}`,
      name: trimmedName,
      shift,
      curriculum,
    };

    if (editingId) {
      setClasses((prev) =>
        prev.map((c) => (c.id === editingId ? payload : c))
      );
      showToast(`Turma "${trimmedName}" atualizada com sucesso!`);
    } else {
      setClasses((prev) => [payload, ...prev]);
      showToast(`Turma "${trimmedName}" cadastrada com sucesso!`);
    }

    handleStartNew();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navegação Superior (Topbar) */}
      <Topbar />

      {/* Estrutura Base: Container Padronizado */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Cabeçalho com Título "Gestão de Turmas" e Botão Primário "+ Nova Turma" */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-600 mb-2.5 shadow-sm">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Estrutura Escolar • Matriz Curricular Base</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Gestão de Turmas
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cadastre as turmas, selecione o turno e defina a carga horária
              semanal das disciplinas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {feedbackMessage && (
              <div className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartNew}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Turma</span>
            </button>
          </div>
        </header>

        {/* Layout de Grade: Duas Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA DA ESQUERDA: Cards das Turmas Cadastradas */}
          <section
            aria-label="Turmas Cadastradas"
            className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Turmas Cadastradas ({classes.length})
                </h2>
              </div>
            </div>

            {classes.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={GraduationCap}
                  title="Nenhuma turma cadastrada ainda"
                  description="Clique em '+ Nova Turma' para cadastrar turmas e montar a matriz curricular."
                  actionButton={
                    <button
                      type="button"
                      onClick={handleStartNew}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Nova Turma</span>
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {classes.map((cls) => {
                  const isSelected = editingId === cls.id;
                  const totalLessons = cls.curriculum.reduce(
                    (acc, i) => acc + i.weeklyClasses,
                    0
                  );
                  const limit = cls.shift === "Integral" ? 45 : 25;
                  const exceeds = totalLessons > limit;

                  return (
                    <div
                      key={cls.id}
                      onClick={() => handleSelectEdit(cls)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer space-y-2.5 ${
                        isSelected
                          ? "bg-indigo-50/60 border-indigo-300 shadow-xs"
                          : "bg-slate-50/50 hover:bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {cls.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase">
                              {cls.shift}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cls.curriculum.length} disciplinas •{" "}
                            <strong
                              className={
                                exceeds ? "text-rose-600" : "text-slate-700"
                              }
                            >
                              {totalLessons}/{limit} aulas semanais
                            </strong>
                          </p>
                        </div>

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectEdit(cls)}
                            title="Editar turma"
                            className={`p-2 rounded-lg transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            }`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            title="Excluir turma"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {cls.curriculum.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cls.curriculum.map((item) => {
                            const color = getColorOption(item.colorId);
                            return (
                              <span
                                key={item.subjectId}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${color.bgClass} ${color.borderClass} ${color.textClass}`}
                              >
                                {item.subjectCode}: {item.weeklyClasses}a
                              </span>
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

          {/* COLUNA DA DIREITA: Formulário de Cadastro/Edição */}
          <section
            aria-label="Formulário de Cadastro de Turma"
            className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 lg:p-8"
          >
            <form onSubmit={handleSaveClass} className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId ? "Editar Turma" : "Cadastrar Nova Turma"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Preencha as informações básicas e configure a Matriz
                    Curricular da turma.
                  </p>
                </div>

                {editingId && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                    Editando
                  </span>
                )}
              </div>

              {/* Informações Básicas: Nome da Turma e Turno (Matutino, Vespertino, Noturno, Integral) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="class-name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                  >
                    Nome da Turma
                  </label>
                  <input
                    id="class-name"
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Ex: 1º Ano A"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="class-shift"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                  >
                    Turno
                  </label>
                  <select
                    id="class-shift"
                    value={shift}
                    onChange={(e) => setShift(e.target.value as ShiftType)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  >
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
              </div>

              {/* Matriz Curricular (Sub-seção Dinâmica) */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Matriz Curricular
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Defina as disciplinas e aulas semanais
                  </span>
                </div>

                {/* Controles: Select Disciplina + Input Aulas Semanais + Botão Secundário "+ Adicionar Disciplina" */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="select-disciplina"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                    >
                      Disciplina
                    </label>
                    <select
                      id="select-disciplina"
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {subjects.length === 0 ? (
                        <option value="">Nenhuma disciplina cadastrada</option>
                      ) : (
                        subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="input-aulas-semanais"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                    >
                      Aulas Semanais
                    </label>
                    <input
                      id="input-aulas-semanais"
                      type="number"
                      min={1}
                      max={20}
                      value={weeklyClassesCount}
                      onChange={(e) =>
                        setWeeklyClassesCount(Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleAddCurriculumItem}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 hover:border-indigo-300 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Adicionar Disciplina</span>
                    </button>
                  </div>
                </div>

                {/* Tabela de Carga Horária */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-4">Disciplina</th>
                        <th className="py-2.5 px-4 text-center">Abreviação</th>
                        <th className="py-2.5 px-4 text-center">
                          Aulas Semanais
                        </th>
                        <th className="py-2.5 px-4 text-right">Excluir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 text-xs">
                      {curriculum.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-6 text-center text-slate-400 italic"
                          >
                            Nenhuma disciplina adicionada. Selecione acima e
                            clique em &ldquo;+ Adicionar Disciplina&rdquo;.
                          </td>
                        </tr>
                      ) : (
                        curriculum.map((item) => {
                          const color = getColorOption(item.colorId);
                          return (
                            <tr
                              key={item.subjectId}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="py-2.5 px-4 font-bold text-slate-800">
                                {item.subjectName}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${color.bgClass} ${color.borderClass} ${color.textClass}`}
                                >
                                  {item.subjectCode}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                                {item.weeklyClasses} aulas
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveCurriculumItem(item.subjectId)
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Remover disciplina"
                                  aria-label={`Remover ${item.subjectName}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Contador de Validação no Rodapé da Matriz Curricular */}
                <div
                  className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isOverLimit
                      ? "bg-orange-50/90 border-rose-300 text-rose-900"
                      : "bg-slate-50 border-slate-200/90 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isOverLimit
                          ? "bg-rose-100 text-rose-600"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {isOverLimit ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Calculator className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Total de Aulas Semanais
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isOverLimit
                            ? "text-rose-700 font-semibold"
                            : "text-slate-500"
                        }`}
                      >
                        {isOverLimit
                          ? `Alerta: Limite recomendado de ${maxRecommendedClasses} aulas para o turno ${shift} foi ultrapassado!`
                          : `Limite recomendado para o turno ${shift}: até ${maxRecommendedClasses} aulas semanais.`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-2xl font-extrabold ${
                        isOverLimit ? "text-rose-700" : "text-indigo-600"
                      }`}
                    >
                      {totalWeeklyClasses}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isOverLimit ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      {" "}
                      / {maxRecommendedClasses} aulas
                    </span>
                  </div>
                </div>
              </div>

              {/* Finalização: Botão Primário "Salvar Turma" */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Turma</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
