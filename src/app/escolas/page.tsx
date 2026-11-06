"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Topbar from "@/components/Topbar";
import EmptyState from "@/components/EmptyState";
import { criarEscola, criarEscolaSchema } from "@/actions/escolaActions";
import {
  SCHOOLS_LIST,
  SCHOOLS_STORAGE_KEY,
  ACTIVE_SCHOOL_STORAGE_KEY,
  SchoolTenant,
  EducationModelType,
} from "@/lib/schoolData";
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Users,
  GraduationCap,
  Save,
  FileBadge,
  Image as ImageIcon,
  X,
  RotateCcw,
  Loader2,
} from "lucide-react";

export default function EscolasPage() {
  const [schools, setSchools] = useState<SchoolTenant[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado do Formulário (Coluna da Direita)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string>("");
  const [cnpjOrInep, setCnpjOrInep] = useState<string>("");
  const [educationModel, setEducationModel] = useState<EducationModelType>(
    "Ensino Fundamental e Médio"
  );
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [logoFileName, setLogoFileName] = useState<string>("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedList = localStorage.getItem(SCHOOLS_STORAGE_KEY);
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed)) {
          setSchools(parsed);
          if (parsed.length > 0 && !activeSchoolId) {
            setActiveSchoolId(parsed[0].id);
          }
        }
      } else {
        setSchools([]);
      }

      const savedActive = localStorage.getItem(ACTIVE_SCHOOL_STORAGE_KEY);
      if (savedActive) {
        setActiveSchoolId(savedActive);
      }
    } catch {
      setSchools([]);
    } finally {
      setIsLoaded(true);
    }

    const handleSchoolChange = (e: Event) => {
      const custom = e as CustomEvent<SchoolTenant>;
      if (custom.detail?.id) {
        setActiveSchoolId(custom.detail.id);
      }
    };

    window.addEventListener("evotime:school-change", handleSchoolChange);
    return () =>
      window.removeEventListener("evotime:school-change", handleSchoolChange);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(schools));
      window.dispatchEvent(new CustomEvent("evotime:schools-updated"));
    } catch {
      // Ignora erro de quota
    }
  }, [schools, isLoaded]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleStartNew = () => {
    setEditingId(null);
    setInstitutionName("");
    setCnpjOrInep("");
    setEducationModel("Ensino Fundamental e Médio");
    setLogoDataUrl(undefined);
    setLogoFileName("");
  };

  const handleSelectEdit = (school: SchoolTenant) => {
    setEditingId(school.id);
    setInstitutionName(school.name);
    setCnpjOrInep(school.cnpjOrInep || "");
    setEducationModel(school.educationModel || "Ensino Fundamental e Médio");
    setLogoDataUrl(school.logoDataUrl);
    setLogoFileName(school.logoDataUrl ? "logo-instituicao.png" : "");
  };

  const handleDeleteSchool = (id: string, name: string) => {
    setSchools((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeSchoolId === id && next.length > 0) {
        setActiveSchoolId(next[0].id);
        localStorage.setItem(ACTIVE_SCHOOL_STORAGE_KEY, next[0].id);
      }
      return next;
    });
    if (editingId === id) {
      handleStartNew();
    }
    showToast(`Instituição "${name}" removida.`);
  };

  const handleSetActiveTenant = (school: SchoolTenant) => {
    setActiveSchoolId(school.id);
    try {
      localStorage.setItem(ACTIVE_SCHOOL_STORAGE_KEY, school.id);
      window.dispatchEvent(
        new CustomEvent("evotime:school-change", { detail: school })
      );
      showToast(`"${school.name}" definida como Escola Ativa!`);
    } catch {
      // Ignora erro
    }
  };

  // Processar arquivo de imagem do Upload de Logo (Clique ou Drag-and-Drop)
  const processLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDropLogo = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const handleSaveInstitution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = institutionName.trim();
    if (!trimmedName) {
      showToast("O nome da instituição é obrigatório.");
      return;
    }

    // Validação com Zod no cliente (CNPJ é opcional)
    const parsed = criarEscolaSchema.safeParse({
      nome: trimmedName,
      cnpj: cnpjOrInep.trim() || null,
      modelo_ensino: educationModel,
      logo_data_url: logoDataUrl || null,
    });

    if (!parsed.success) {
      const firstError = Object.values(
        parsed.error.flatten().fieldErrors
      )[0]?.[0];
      showToast(firstError || "Preencha os campos obrigatórios.");
      return;
    }

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    startTransition(async () => {
      // Executa a Server Action do Supabase
      const result = await criarEscola(formData);

      if (result.success) {
        const createdId = result.data?.id || `escola-${Date.now()}`;
        const payload: SchoolTenant = {
          id: createdId,
          name: result.data?.nome || trimmedName,
          subtitle: result.data?.subtitulo || educationModel,
          cnpjOrInep:
            result.data?.cnpj_ou_inep ||
            result.data?.cnpj ||
            (cnpjOrInep.trim() ? cnpjOrInep.trim() : "Não informado"),
          educationModel,
          studentsCount: 0,
          classesCount: 0,
          city: "Unidade Cadastrada",
          planBadge: "Tenant Ativo",
          logoDataUrl,
        };

        setSchools((prev) => [payload, ...prev]);
        setActiveSchoolId(payload.id);
        localStorage.setItem(ACTIVE_SCHOOL_STORAGE_KEY, payload.id);
        window.dispatchEvent(
          new CustomEvent("evotime:school-change", { detail: payload })
        );
        showToast(
          `Instituição "${trimmedName}" salva no Supabase com sucesso!`
        );
        handleStartNew();
      } else {
        showToast(`Erro ao salvar no banco: ${result.error}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de Navegação Superior (Topbar) */}
      <Topbar />

      {/* Container Padronizado */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Cabeçalho: Título "Gestão de Escolas (Multi-tenant)" e Botão "+ Nova Escola" */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-600 mb-2.5 shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Painel de Agência / Super Admin • SaaS Multi-Escola</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Gestão de Escolas (Multi-tenant)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Registre e gerencie as instituições de ensino atendidas pela
              plataforma antes de configurar matrizes e horários.
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
              <span>+ Nova Escola</span>
            </button>
          </div>
        </header>

        {/* Layout de Duas Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA DA ESQUERDA: Cards das Escolas Cadastradas */}
          <section
            aria-label="Escolas Cadastradas"
            className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Instituições Registradas ({schools.length})
                </h2>
              </div>
            </div>

            {schools.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={Building2}
                  title="Nenhuma escola cadastrada ainda"
                  description="Cadastre a primeira instituição preenchendo o formulário ao lado."
                  actionButton={
                    <button
                      type="button"
                      onClick={handleStartNew}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Nova Escola</span>
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {schools.map((school) => {
                  const isEditing = editingId === school.id;
                  const isActiveTenant = activeSchoolId === school.id;

                  return (
                    <div
                      key={school.id}
                      onClick={() => handleSelectEdit(school)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer space-y-3 ${
                        isEditing
                          ? "bg-indigo-50/60 border-indigo-300 shadow-xs"
                          : "bg-slate-50/50 hover:bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                            {school.logoDataUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={school.logoDataUrl}
                                alt={school.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-bold text-slate-900 truncate">
                                {school.name}
                              </h3>
                              {isActiveTenant && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Ativa
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-medium text-indigo-600 mt-0.5">
                              {school.educationModel || school.subtitle}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {school.cnpjOrInep}
                            </p>
                          </div>
                        </div>

                        {/* Ações: Editar e Excluir */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectEdit(school)}
                            title="Editar instituição"
                            className={`p-2 rounded-lg transition-colors ${
                              isEditing
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            }`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSchool(school.id, school.name)
                            }
                            title="Excluir instituição"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Rodapé do Card: Quantidade simulada de Alunos e Turmas + Botão Ativar */}
                      <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-3 text-slate-600 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                            <strong>{school.classesCount}</strong> turmas
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <strong>
                              {school.studentsCount.toLocaleString("pt-BR")}
                            </strong>{" "}
                            alunos
                          </span>
                        </div>

                        {!isActiveTenant && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetActiveTenant(school);
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            Selecionar na Topbar →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* COLUNA DA DIREITA: Formulário de Cadastro de Instituição */}
          <section
            aria-label="Formulário de Cadastro de Escola"
            className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 lg:p-8"
          >
            <form onSubmit={handleSaveInstitution} className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId
                      ? "Editar Instituição de Ensino"
                      : "Cadastrar Nova Instituição"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Preencha os dados institucionais, modelo pedagógico e envie
                    a logo da escola.
                  </p>
                </div>

                {editingId && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                    Editando
                  </span>
                )}
              </div>

              {/* Inputs: Nome da Instituição e CNPJ ou INEP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="institution-name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                  >
                    Nome da Instituição
                  </label>
                  <input
                    id="institution-name"
                    name="nome"
                    type="text"
                    required
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Ex: Colégio Santa Maria"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="institution-cnpj"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      CNPJ ou INEP
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium lowercase">
                      (opcional)
                    </span>
                  </div>
                  <div className="relative">
                    <FileBadge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="institution-cnpj"
                      name="cnpj"
                      type="text"
                      value={cnpjOrInep}
                      onChange={(e) => setCnpjOrInep(e.target.value)}
                      placeholder="Ex: 12.345.678/0001-90 (opcional)"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Select: Modelo de Ensino Base */}
              <div>
                <label
                  htmlFor="education-model"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Modelo de Ensino Base
                </label>
                <select
                  id="education-model"
                  name="modelo_ensino"
                  value={educationModel}
                  onChange={(e) =>
                    setEducationModel(e.target.value as EducationModelType)
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  <option value="Ensino Fundamental">Ensino Fundamental</option>
                  <option value="Ensino Médio">Ensino Médio</option>
                  <option value="Ensino Técnico">Ensino Técnico</option>
                  <option value="Ensino Fundamental e Médio">
                    Ensino Fundamental e Médio
                  </option>
                </select>
              </div>

              {/* Input Oculto para Logo */}
              <input
                type="hidden"
                name="logo_data_url"
                value={logoDataUrl || ""}
              />

              {/* Campo Visual de Upload de Logo (Área Tracejada de Drag-and-Drop) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Upload de Logo
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processLogoFile(file);
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleDropLogo}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                    isDraggingOver
                      ? "border-indigo-500 bg-indigo-50/70"
                      : logoDataUrl
                      ? "border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50"
                      : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/20"
                  }`}
                >
                  {logoDataUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-16 h-16 rounded-2xl border border-slate-200 bg-white p-1 shadow-xs overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoDataUrl}
                          alt="Preview da Logo"
                          className="w-full h-full object-contain rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoDataUrl(undefined);
                            setLogoFileName("");
                          }}
                          title="Remover imagem"
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{logoFileName || "Logo carregada"}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Clique ou arraste outra imagem para substituir
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Arraste e solte o brasão/logo da escola aqui, ou{" "}
                          <span className="text-indigo-600 underline">
                            clique para selecionar
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Suporta PNG, JPG, SVG ou WEBP (Recomendado: 256×256px)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Finalização: Botão Primário "Salvar Instituição" */}
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
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Instituição</span>
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
