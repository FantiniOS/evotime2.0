"use client";

import React, { useState, useEffect, useRef } from "react";
import Topbar from "@/components/Topbar";
import { salvarConfiguracoesEscola } from "@/actions/escolaActions";
import {
  SCHOOLS_LIST,
  SCHOOLS_STORAGE_KEY,
  ACTIVE_SCHOOL_STORAGE_KEY,
  FALLBACK_EMPTY_SCHOOL,
  SchoolTenant,
} from "@/lib/schoolData";
import {
  Settings,
  Building2,
  Clock,
  Sparkles,
  UploadCloud,
  FileBadge,
  Image as ImageIcon,
  X,
  Save,
  CheckCircle2,
  Sun,
  Sunset,
  Moon,
  CalendarCheck,
  Sliders,
  Users,
  GraduationCap,
  ShieldAlert,
  Ban,
} from "lucide-react";

type ConfigTab = "geral" | "turnos" | "regras-ia";

interface ShiftStructureConfig {
  enabled: boolean;
  slotsCount: number; // Quantidade de Aulas (Slots) no Turno (ex: 5)
  breakAfterSlot: number; // Posição do Intervalo (ex: Após a 3ª Aula -> 3)
}

interface SchoolSettingsPayload {
  shifts: {
    manha: ShiftStructureConfig;
    tarde: ShiftStructureConfig;
    noite: ShiftStructureConfig;
  };
  includeSaturdays: boolean;
  aiRules: {
    allowTeacherGaps: boolean;
    enforceMaxTwoConsecutive: boolean;
    bloquearAulasGeminadas: boolean; // Hard Constraint: Bloqueio Estrito de Aulas Geminadas
    decisionBalance: number; // 0 = Conforto do Professor, 100 = Distribuição Didática do Aluno
  };
}

const DEFAULT_SETTINGS: SchoolSettingsPayload = {
  shifts: {
    manha: { enabled: true, slotsCount: 5, breakAfterSlot: 3 },
    tarde: { enabled: true, slotsCount: 5, breakAfterSlot: 3 },
    noite: { enabled: false, slotsCount: 4, breakAfterSlot: 2 },
  },
  includeSaturdays: false,
  aiRules: {
    allowTeacherGaps: false,
    enforceMaxTwoConsecutive: true,
    bloquearAulasGeminadas: true, // Padrão: Ativado (True)
    decisionBalance: 55,
  },
};

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<ConfigTab>("geral");
  const [activeSchool, setActiveSchool] = useState<SchoolTenant>(
    SCHOOLS_LIST[0] || FALLBACK_EMPTY_SCHOOL
  );

  // Estado da Aba 1 - Geral
  const [institutionName, setInstitutionName] = useState<string>(
    SCHOOLS_LIST[0]?.name || FALLBACK_EMPTY_SCHOOL.name
  );
  const [cnpj, setCnpj] = useState<string>(
    SCHOOLS_LIST[0]?.cnpjOrInep || FALLBACK_EMPTY_SCHOOL.cnpjOrInep
  );
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(
    SCHOOLS_LIST[0]?.logoDataUrl
  );
  const [logoFileName, setLogoFileName] = useState<string>("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Estado das Abas 2 e 3 (Estrutura de Turnos e Regras da IA)
  const [settings, setSettings] =
    useState<SchoolSettingsPayload>(DEFAULT_SETTINGS);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar com a Escola Ativa selecionada na Topbar
  useEffect(() => {
    const syncFromActiveSchool = () => {
      try {
        let list = SCHOOLS_LIST;
        const savedList = localStorage.getItem(SCHOOLS_STORAGE_KEY);
        if (savedList) {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        }

        const savedActiveId = localStorage.getItem(ACTIVE_SCHOOL_STORAGE_KEY);
        const current =
          (list.length > 0
            ? list.find((s) => s.id === savedActiveId) || list[0]
            : null) || FALLBACK_EMPTY_SCHOOL;

        setActiveSchool(current);
        setInstitutionName(current.name);
        setCnpj(current.cnpjOrInep || "");
        setLogoDataUrl(current.logoDataUrl);
        setLogoFileName(current.logoDataUrl ? "logo-atual.png" : "");

        // Carregar configurações específicas desta escola
        const savedConfig = localStorage.getItem(
          `evotime_config_${current.id}`
        );
        if (savedConfig) {
          setSettings(JSON.parse(savedConfig));
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch {
        // Fallback
      }
    };

    syncFromActiveSchool();
    window.addEventListener("evotime:school-change", syncFromActiveSchool);
    window.addEventListener("evotime:schools-updated", syncFromActiveSchool);
    return () => {
      window.removeEventListener(
        "evotime:school-change",
        syncFromActiveSchool
      );
      window.removeEventListener(
        "evotime:schools-updated",
        syncFromActiveSchool
      );
    };
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Upload de Logo (Clique ou Drag-and-Drop)
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

  // Atualizar parâmetros de um turno
  const updateShift = (
    shiftKey: "manha" | "tarde" | "noite",
    patch: Partial<ShiftStructureConfig>
  ) => {
    setSettings((prev) => ({
      ...prev,
      shifts: {
        ...prev.shifts,
        [shiftKey]: {
          ...prev.shifts[shiftKey],
          ...patch,
        },
      },
    }));
  };

  // Salvar todas as configurações da Escola Ativa
  const handleSaveSettings = async () => {
    try {
      // 1. Salvar parâmetros de turnos e IA no Supabase via Server Action
      if (activeSchool.id && activeSchool.id !== "escola-padrao") {
        await salvarConfiguracoesEscola({
          escolaId: activeSchool.id,
          nome: institutionName.trim() || activeSchool.name,
          cnpj: cnpj.trim() || null,
          bloquear_aulas_geminadas:
            settings.aiRules.bloquearAulasGeminadas ?? true,
          configuracoes_ia: settings.aiRules,
          turnos: settings.shifts,
        });
      }

      // 2. Salvar parâmetros de turnos e IA no cache local
      localStorage.setItem(
        `evotime_config_${activeSchool.id}`,
        JSON.stringify(settings)
      );

      // 3. Atualizar dados gerais da escola ativa na lista multi-tenant
      let list = SCHOOLS_LIST;
      const savedList = localStorage.getItem(SCHOOLS_STORAGE_KEY);
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }

      const updatedList = list.map((s) =>
        s.id === activeSchool.id
          ? {
              ...s,
              name: institutionName.trim() || s.name,
              cnpjOrInep: cnpj.trim() || s.cnpjOrInep,
              logoDataUrl,
            }
          : s
      );

      localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent("evotime:schools-updated"));
      showToast(
        `Configurações de "${
          institutionName.trim() || activeSchool.name
        }" salvas com sucesso!`
      );
    } catch {
      showToast("Configurações aplicadas!");
    }
  };

  const shiftCards: {
    key: "manha" | "tarde" | "noite";
    label: string;
    description: string;
    icon: React.ElementType;
    accentBg: string;
    accentText: string;
  }[] = [
    {
      key: "manha",
      label: "Manhã",
      description: "Turno Matutino • Séries regulares",
      icon: Sun,
      accentBg: "bg-amber-50 border-amber-200",
      accentText: "text-amber-600",
    },
    {
      key: "tarde",
      label: "Tarde",
      description: "Turno Vespertino • Ensino Fundamental / Médio",
      icon: Sunset,
      accentBg: "bg-orange-50 border-orange-200",
      accentText: "text-orange-600",
    },
    {
      key: "noite",
      label: "Noite",
      description: "Turno Noturno • Ensino Médio / Técnico",
      icon: Moon,
      accentBg: "bg-indigo-50 border-indigo-200",
      accentText: "text-indigo-600",
    },
  ];

  const teacherWeight = 100 - settings.aiRules.decisionBalance;
  const studentWeight = settings.aiRules.decisionBalance;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Barra de Navegação Superior (Topbar) */}
      <Topbar />

      {/* Container Padrão */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Cabeçalho da Página */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-600 mb-2.5 shadow-2xs">
              <Settings className="w-3.5 h-3.5 text-indigo-600" />
              <span>Parâmetros da Escola Ativa • {activeSchool.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Configurações da Instituição
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie os dados institucionais, o esqueleto de turnos/aulas e as
              diretrizes globais do motor de Inteligência Artificial.
            </p>
          </div>

          {feedbackMessage && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-sm transition-all">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </header>

        {/* Sistema de Navegação por Abas (Tabs): "Geral", "Estrutura de Turnos" e "Regras da IA" */}
        <div
          role="tablist"
          aria-label="Abas de Configuração da Instituição"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "geral"}
            onClick={() => setActiveTab("geral")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === "geral"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Geral</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "turnos"}
            onClick={() => setActiveTab("turnos")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === "turnos"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Estrutura de Turnos</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "regras-ia"}
            onClick={() => setActiveTab("regras-ia")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === "regras-ia"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Regras da IA</span>
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="transition-all duration-300">
          {/* ABA 1: GERAL */}
          {activeTab === "geral" && (
            <section
              role="tabpanel"
              aria-label="Aba Geral"
              className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 lg:p-8 space-y-6 transition-all duration-300"
            >
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">
                  Dados Básicos da Instituição
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atualize a identificação oficial e a marca visual da escola
                  atualmente ativa no sistema.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome da Instituição */}
                <div>
                  <label
                    htmlFor="config-school-name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                  >
                    Nome da Instituição
                  </label>
                  <input
                    id="config-school-name"
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Ex: Colégio Santa Maria"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                {/* CNPJ */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="config-school-cnpj"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      CNPJ
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium lowercase">
                      (opcional)
                    </span>
                  </div>
                  <div className="relative">
                    <FileBadge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="config-school-cnpj"
                      type="text"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="Ex: 12.345.678/0001-90 (opcional)"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Área de Upload Drag-and-Drop para atualizar a Logo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Logo da Instituição (Drag-and-Drop)
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
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDraggingOver
                      ? "border-indigo-500 bg-indigo-50/70"
                      : logoDataUrl
                      ? "border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50"
                      : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/20"
                  }`}
                >
                  {logoDataUrl ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="relative w-20 h-20 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoDataUrl}
                          alt="Logo da Escola"
                          className="w-full h-full object-contain rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoDataUrl(undefined);
                            setLogoFileName("");
                          }}
                          title="Remover logo"
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{logoFileName || "Logo configurada"}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Clique ou arraste um novo arquivo para atualizar a logo
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Arraste e solte a nova logo da instituição aqui, ou{" "}
                          <span className="text-indigo-600 underline">
                            clique para procurar
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PNG, JPG, SVG ou WEBP • Atualização refletida no
                          seletor da Topbar
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ABA 2: ESTRUTURA DE TURNOS (O CORE DO SISTEMA) */}
          {activeTab === "turnos" && (
            <section
              role="tabpanel"
              aria-label="Aba Estrutura de Turnos"
              className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 lg:p-8 space-y-6 transition-all duration-300"
            >
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">
                  Estrutura de Turnos (Esqueleto da Grade)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ative os turnos em funcionamento na escola e defina a
                  quantidade de aulas (slots) e a posição do intervalo.
                </p>
              </div>

              {/* Cards dos Turnos: Manhã, Tarde e Noite */}
              <div className="space-y-4">
                {shiftCards.map((item) => {
                  const Icon = item.icon;
                  const shiftConfig = settings.shifts[item.key];

                  return (
                    <div
                      key={item.key}
                      className={`rounded-xl border p-5 transition-all duration-300 ${
                        shiftConfig.enabled
                          ? "bg-white border-indigo-200 shadow-2xs"
                          : "bg-slate-50/70 border-slate-200/80 opacity-80"
                      }`}
                    >
                      {/* Linha Superior: Identificação do Turno + Toggle Liga/Desliga */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.accentBg} ${item.accentText}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">
                                Turno da {item.label}
                              </h3>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  shiftConfig.enabled
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-200/70 text-slate-600"
                                }`}
                              >
                                {shiftConfig.enabled ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Toggle Liga/Desliga */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={shiftConfig.enabled}
                          onClick={() =>
                            updateShift(item.key, {
                              enabled: !shiftConfig.enabled,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${
                            shiftConfig.enabled
                              ? "bg-indigo-600"
                              : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${
                              shiftConfig.enabled
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Bloco Dinâmico quando o Turno está Ativado */}
                      {shiftConfig.enabled && (
                        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300">
                          {/* Input 1: Quantidade de Aulas (Slots) no Turno */}
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Quantidade de Aulas (Slots) no Turno
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={shiftConfig.slotsCount}
                                onChange={(e) =>
                                  updateShift(item.key, {
                                    slotsCount: Math.max(
                                      1,
                                      Math.min(10, Number(e.target.value))
                                    ),
                                  })
                                }
                                className="w-24 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-extrabold text-indigo-600 text-center focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                              />
                              <span className="text-xs font-medium text-slate-500">
                                Ex: {shiftConfig.slotsCount} aulas diárias (1ª à{" "}
                                {shiftConfig.slotsCount}ª Aula)
                              </span>
                            </div>
                          </div>

                          {/* Input 2: Posição do Intervalo */}
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Posição do Intervalo
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, shiftConfig.slotsCount - 1)}
                                value={shiftConfig.breakAfterSlot}
                                onChange={(e) =>
                                  updateShift(item.key, {
                                    breakAfterSlot: Math.max(
                                      1,
                                      Math.min(
                                        shiftConfig.slotsCount,
                                        Number(e.target.value)
                                      )
                                    ),
                                  })
                                }
                                className="w-24 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-extrabold text-indigo-600 text-center focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                              />
                              <span className="text-xs font-semibold text-slate-700">
                                Após a {shiftConfig.breakAfterSlot}ª Aula
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Checkbox de Dias Letivos: "Incluir Sábados na Grade?" */}
              <div className="pt-2">
                <label className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 flex items-center justify-between gap-4 cursor-pointer transition-all select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">
                        Incluir Sábados na Grade?
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Adiciona uma 6ª coluna (Sábado) na Matriz de Horários e
                        na Matriz de Disponibilidade dos professores.
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.includeSaturdays}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        includeSaturdays: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>
            </section>
          )}

          {/* ABA 3: REGRAS DA IA (CONFIGURAÇÃO GLOBAL) */}
          {activeTab === "regras-ia" && (
            <section
              role="tabpanel"
              aria-label="Aba Regras da IA"
              className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 lg:p-8 space-y-8 transition-all duration-300"
            >
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Diretrizes de Otimização (Motor IA)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure as restrições globais e os pesos de decisão do
                    algoritmo gerador de grades.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                  <Sliders className="w-3.5 h-3.5" />
                  Pesos Heurísticos
                </span>
              </div>

              {/* Toggles para Regras Pesadas */}
              <div className="space-y-4">
                {/* Toggle HARD CONSTRAINT: Bloqueio Estrito de Aulas Geminadas */}
                <div
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      aiRules: {
                        ...prev.aiRules,
                        bloquearAulasGeminadas:
                          !prev.aiRules.bloquearAulasGeminadas,
                      },
                    }))
                  }
                  className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 select-none relative overflow-hidden ${
                    settings.aiRules.bloquearAulasGeminadas
                      ? "bg-gradient-to-r from-red-50/70 via-indigo-50/40 to-slate-50 border-red-300/80 shadow-xs"
                      : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60"
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-red-100 text-red-700">
                        <ShieldAlert className="w-4 h-4" />
                      </span>
                      <p className="text-sm font-extrabold text-slate-900">
                        Bloqueio Estrito de Aulas Geminadas
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                        Hard Constraint
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Impede a IA de agendar duas aulas da mesma disciplina em
                      horários consecutivos no mesmo dia. Regra absoluta (Hard Constraint).
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.aiRules.bloquearAulasGeminadas}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettings((prev) => ({
                        ...prev,
                        aiRules: {
                          ...prev.aiRules,
                          bloquearAulasGeminadas:
                            !prev.aiRules.bloquearAulasGeminadas,
                        },
                      }));
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${
                      settings.aiRules.bloquearAulasGeminadas
                        ? "bg-red-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${
                        settings.aiRules.bloquearAulasGeminadas
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 1: Permitir janelas (horários vagos) para professores se necessário? */}
                <div
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      aiRules: {
                        ...prev.aiRules,
                        allowTeacherGaps: !prev.aiRules.allowTeacherGaps,
                      },
                    }))
                  }
                  className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 select-none ${
                    settings.aiRules.allowTeacherGaps
                      ? "bg-indigo-50/40 border-indigo-200"
                      : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Permitir janelas (horários vagos) para professores se
                      necessário?
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Quando ativado, a IA pode criar janelas pontuais entre
                      aulas caso seja a única solução para evitar choques entre
                      turmas.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.aiRules.allowTeacherGaps}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettings((prev) => ({
                        ...prev,
                        aiRules: {
                          ...prev.aiRules,
                          allowTeacherGaps: !prev.aiRules.allowTeacherGaps,
                        },
                      }));
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${
                      settings.aiRules.allowTeacherGaps
                        ? "bg-indigo-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${
                        settings.aiRules.allowTeacherGaps
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 2: Forçar o limite máximo de 2 aulas consecutivas da mesma matéria? */}
                <div
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      aiRules: {
                        ...prev.aiRules,
                        enforceMaxTwoConsecutive:
                          !prev.aiRules.enforceMaxTwoConsecutive,
                      },
                    }))
                  }
                  className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 select-none ${
                    settings.aiRules.enforceMaxTwoConsecutive
                      ? "bg-indigo-50/40 border-indigo-200"
                      : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Forçar o limite máximo de 2 aulas consecutivas da mesma
                      matéria?
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Bloqueia automaticamente a criação de triplas ou mais
                      aulas seguidas da mesma disciplina no mesmo dia para uma
                      turma.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.aiRules.enforceMaxTwoConsecutive}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettings((prev) => ({
                        ...prev,
                        aiRules: {
                          ...prev.aiRules,
                          enforceMaxTwoConsecutive:
                            !prev.aiRules.enforceMaxTwoConsecutive,
                        },
                      }));
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${
                      settings.aiRules.enforceMaxTwoConsecutive
                        ? "bg-indigo-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${
                        settings.aiRules.enforceMaxTwoConsecutive
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Slider Interativo de Decisão em Conflitos Não Impeditivos */}
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/90 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Balanço de Decisão da IA em Conflitos Não Impeditivos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ajuste o cursor para definir quem o algoritmo deve
                      priorizar ao desempatar alocações válidas.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-indigo-700 shrink-0">
                    {teacherWeight}% Professor • {studentWeight}% Aluno
                  </span>
                </div>

                {/* Barra Deslizante Interativa (Slider) */}
                <div className="space-y-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={settings.aiRules.decisionBalance}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        aiRules: {
                          ...prev.aiRules,
                          decisionBalance: Number(e.target.value),
                        },
                      }))
                    }
                    aria-label="Balanço entre Conforto do Professor e Distribuição Didática do Aluno"
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />

                  <div className="flex items-center justify-between gap-4 text-xs font-bold">
                    <div
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                        teacherWeight >= 50
                          ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Priorizar Conforto do Professor</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-right ${
                        studentWeight >= 50
                          ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <span>Priorizar Distribuição Didática do Aluno</span>
                      <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Ação Principal: Botão Primário "Salvar Configurações" Fixado no Canto Inferior Direito */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleSaveSettings}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Configurações</span>
        </button>
      </div>
    </div>
  );
}
