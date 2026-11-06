"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Topbar from "@/components/Topbar";
import {
  SCHOOLS_LIST,
  SCHOOLS_STORAGE_KEY,
  ACTIVE_SCHOOL_STORAGE_KEY,
  FALLBACK_EMPTY_SCHOOL,
  SchoolTenant,
} from "@/lib/schoolData";
import type {
  VectorReportVision,
  ShiftOption,
  VectorLessonCell,
  VectorScheduleSheet,
  ScheduleVectorDocumentProps,
} from "@/components/pdf/ScheduleVectorDocument";
import {
  Download,
  Loader2,
  Check,
  ChevronDown,
  FileCode2,
  Sliders,
  Layers,
  Clock,
  Sparkles,
  FileCheck2,
  CheckCircle2,
} from "lucide-react";

// Carrega o <PDFViewer> do @react-pdf/renderer apenas no cliente (SSR desativado)
const VectorPdfClientStudio = dynamic(
  () => import("@/components/pdf/VectorPdfClientStudio"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white rounded-xl border border-slate-700 gap-3">
        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-bold">
            Inicializando Motor Vetorial @react-pdf/renderer...
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Montando páginas A4 Paisagem com texto selecionável e paginação
            automática
          </p>
        </div>
      </div>
    ),
  }
);

function buildPeriodsForSeed(
  seedIndex: number
): VectorScheduleSheet["periods"] {
  const subjectsPool: VectorLessonCell[] = [
    {
      subject: "Matemática",
      teacher: "Prof. Ricardo Almeida",
      room: `Sala 10${seedIndex + 1}`,
      code: "MAT",
      tone: "indigo",
    },
    {
      subject: "Língua Portuguesa",
      teacher: "Profa. Helena Costa",
      room: `Sala 10${seedIndex + 1}`,
      code: "POR",
      tone: "purple",
    },
    {
      subject: "Biologia",
      teacher: "Profa. Camila Rocha",
      room: "Lab. Ciências",
      code: "BIO",
      tone: "emerald",
    },
    {
      subject: "Física",
      teacher: "Prof. André Santos",
      room: `Sala 10${seedIndex + 1}`,
      code: "FIS",
      tone: "sky",
    },
    {
      subject: "História",
      teacher: "Prof. Marcelo Viana",
      room: `Sala 10${seedIndex + 1}`,
      code: "HIS",
      tone: "amber",
    },
    {
      subject: "Química",
      teacher: "Profa. Patrícia Lima",
      room: "Lab. Química",
      code: "QUI",
      tone: "rose",
    },
  ];

  const pick = (offset: number) =>
    subjectsPool[(seedIndex + offset) % subjectsPool.length];

  return [
    {
      periodLabel: "1ª Aula",
      days: {
        seg: pick(0),
        ter: pick(2),
        qua: pick(4),
        qui: pick(1),
        sex: pick(3),
        sab: pick(5),
      },
    },
    {
      periodLabel: "2ª Aula",
      days: {
        seg: pick(3),
        ter: pick(5),
        qua: pick(1),
        qui: pick(0),
        sex: pick(2),
        sab: pick(4),
      },
    },
    {
      periodLabel: "3ª Aula",
      days: {
        seg: pick(2),
        ter: pick(4),
        qua: pick(5),
        qui: pick(2),
        sex: pick(0),
        sab: pick(1),
      },
    },
    {
      periodLabel: "Intervalo",
      isBreak: true,
      days: {
        seg: pick(0),
        ter: pick(0),
        qua: pick(0),
        qui: pick(0),
        sex: pick(0),
        sab: pick(0),
      },
    },
    {
      periodLabel: "4ª Aula",
      days: {
        seg: pick(1),
        ter: pick(0),
        qua: pick(2),
        qui: pick(4),
        sex: pick(5),
        sab: pick(3),
      },
    },
    {
      periodLabel: "5ª Aula",
      days: {
        seg: pick(4),
        ter: pick(1),
        qua: pick(0),
        qui: pick(5),
        sex: pick(2),
        sab: pick(0),
      },
    },
  ];
}

const ALL_TURMAS_SHEETS: VectorScheduleSheet[] = [
  {
    id: "turma-1a-m",
    name: "1º Ano A",
    yearGroup: "1º Ano",
    shift: "Manhã",
    shiftLabel: "Turno da Manhã",
    room: "Bloco A • Sala 101",
    coordinator: "Coord. Fernanda Azevedo",
    periods: buildPeriodsForSeed(0),
  },
  {
    id: "turma-1b-m",
    name: "1º Ano B",
    yearGroup: "1º Ano",
    shift: "Manhã",
    shiftLabel: "Turno da Manhã",
    room: "Bloco A • Sala 102",
    coordinator: "Coord. Fernanda Azevedo",
    periods: buildPeriodsForSeed(1),
  },
  {
    id: "turma-2a-m",
    name: "2º Ano A",
    yearGroup: "2º Ano",
    shift: "Manhã",
    shiftLabel: "Turno da Manhã",
    room: "Bloco B • Sala 201",
    coordinator: "Coord. Roberto Tavares",
    periods: buildPeriodsForSeed(2),
  },
  {
    id: "turma-3a-m",
    name: "3º Ano A",
    yearGroup: "3º Ano",
    shift: "Manhã",
    shiftLabel: "Turno da Manhã",
    room: "Bloco C • Sala 301",
    coordinator: "Coord. Fernanda Azevedo",
    periods: buildPeriodsForSeed(3),
  },
  {
    id: "turma-2b-t",
    name: "2º Ano B",
    yearGroup: "2º Ano",
    shift: "Tarde",
    shiftLabel: "Turno da Tarde",
    room: "Bloco B • Sala 202",
    coordinator: "Coord. Roberto Tavares",
    periods: buildPeriodsForSeed(4),
  },
  {
    id: "turma-9a-t",
    name: "9º Ano A",
    yearGroup: "9º Ano",
    shift: "Tarde",
    shiftLabel: "Turno da Tarde",
    room: "Bloco A • Sala 105",
    coordinator: "Coord. Roberto Tavares",
    periods: buildPeriodsForSeed(1),
  },
  {
    id: "turma-3n-n",
    name: "3º Ano C (Noturno)",
    yearGroup: "3º Ano",
    shift: "Noite",
    shiftLabel: "Turno da Noite",
    room: "Bloco C • Sala 304",
    coordinator: "Coord. Marcos Vinícius",
    periods: buildPeriodsForSeed(2),
  },
  {
    id: "turma-eja-n",
    name: "Técnico Integrado I",
    yearGroup: "Técnico",
    shift: "Noite",
    shiftLabel: "Turno da Noite",
    room: "Lab. Multimídia",
    coordinator: "Coord. Marcos Vinícius",
    periods: buildPeriodsForSeed(5),
  },
];

const PROFESSORES_SHEETS: VectorScheduleSheet[] = [
  {
    id: "prof-ricardo",
    name: "Prof. Ricardo Almeida (Matemática)",
    yearGroup: "Exatas",
    shift: "Manhã",
    shiftLabel: "Manhã / Tarde",
    room: "Depto. de Matemática",
    coordinator: "24 aulas semanais",
    periods: buildPeriodsForSeed(0),
  },
  {
    id: "prof-camila",
    name: "Profa. Camila Rocha (Biologia)",
    yearGroup: "Ciências",
    shift: "Manhã",
    shiftLabel: "Turno da Manhã",
    room: "Lab. de Biologia",
    coordinator: "20 aulas semanais",
    periods: buildPeriodsForSeed(2),
  },
  {
    id: "prof-andre",
    name: "Prof. André Santos (Física)",
    yearGroup: "Exatas",
    shift: "Manhã",
    shiftLabel: "Turno da Manhã",
    room: "Depto. de Física",
    coordinator: "18 aulas semanais",
    periods: buildPeriodsForSeed(3),
  },
  {
    id: "prof-helena",
    name: "Profa. Helena Costa (Português)",
    yearGroup: "Linguagens",
    shift: "Tarde",
    shiftLabel: "Manhã / Tarde",
    room: "Depto. de Letras",
    coordinator: "22 aulas semanais",
    periods: buildPeriodsForSeed(1),
  },
];

export default function ExportarPage() {
  const [activeSchool, setActiveSchool] = useState<SchoolTenant>(
    SCHOOLS_LIST[0] || FALLBACK_EMPTY_SCHOOL
  );

  // 1. Select Principal: "Visão do Relatório"
  const [vision, setVision] = useState<VectorReportVision>("turmas");

  // 2. Se "Mapa Geral da Escola", filtro de "Turno" (Manhã, Tarde, Noite)
  const [selectedShift, setSelectedShift] = useState<ShiftOption>("Manhã");

  // 3. Seleção Múltipla (para "Grade por Turmas" ou "Grade por Professores")
  const [selectedIds, setSelectedIds] = useState<string[]>([
    ALL_TURMAS_SHEETS[0].id,
    ALL_TURMAS_SHEETS[1].id,
  ]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 4. Opções do Motor Vetorial
  const [grayscaleMode, setGrayscaleMode] = useState<boolean>(false);
  const [hideWeekends, setHideWeekends] = useState<boolean>(true);
  const [showTeacherName, setShowTeacherName] = useState<boolean>(true);
  const [forcePageBreak, setForcePageBreak] = useState<boolean>(true);

  // 5. Estado de download do PDF Oficial
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Sincroniza a escola ativa com a Topbar
  useEffect(() => {
    const syncSchool = () => {
      try {
        let list = SCHOOLS_LIST;
        const savedList = localStorage.getItem(SCHOOLS_STORAGE_KEY);
        if (savedList) {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }
        const savedId = localStorage.getItem(ACTIVE_SCHOOL_STORAGE_KEY);
        const found =
          (list.length > 0
            ? list.find((s) => s.id === savedId) || list[0]
            : null) || FALLBACK_EMPTY_SCHOOL;
        setActiveSchool(found);
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

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const availableItems =
    vision === "professores" ? PROFESSORES_SHEETS : ALL_TURMAS_SHEETS;

  const handleChangeVision = (nextVision: VectorReportVision) => {
    setVision(nextVision);
    if (nextVision === "turmas") {
      setSelectedIds([ALL_TURMAS_SHEETS[0].id, ALL_TURMAS_SHEETS[1].id]);
    } else if (nextVision === "professores") {
      setSelectedIds([PROFESSORES_SHEETS[0].id, PROFESSORES_SHEETS[1].id]);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const selectedSheets = useMemo(
    () => availableItems.filter((item) => selectedIds.includes(item.id)),
    [availableItems, selectedIds]
  );

  // Turmas do Turno selecionado para o "Mapa Geral da Escola"
  const shiftTurmas = useMemo(
    () => ALL_TURMAS_SHEETS.filter((t) => t.shift === selectedShift),
    [selectedShift]
  );

  const generatedTimestamp = "06/11/2026 às 08:30";

  const pdfDocumentProps: ScheduleVectorDocumentProps = useMemo(
    () => ({
      school: {
        name: activeSchool.name,
        subtitle: activeSchool.educationModel || activeSchool.subtitle,
        cnpjOrInep: activeSchool.cnpjOrInep,
        logoDataUrl: activeSchool.logoDataUrl,
      },
      vision,
      selectedShift,
      sheets: selectedSheets,
      allShiftTurmas:
        shiftTurmas.length > 0 ? shiftTurmas : ALL_TURMAS_SHEETS.slice(0, 4),
      grayscaleMode,
      hideWeekends,
      showTeacherName,
      forcePageBreak,
      generatedAt: generatedTimestamp,
      academicYear: "Ano Letivo 2026",
    }),
    [
      activeSchool,
      vision,
      selectedShift,
      selectedSheets,
      shiftTurmas,
      grayscaleMode,
      hideWeekends,
      showTeacherName,
      forcePageBreak,
    ]
  );

  const handleDownloadOfficialPdf = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      const { generateAndDownloadOfficialPdf } = await import(
        "@/components/pdf/VectorPdfClientStudio"
      );
      const slug = activeSchool.id || "escola";
      const fileName =
        vision === "mapa_geral"
          ? `evotime-mapa-geral-${selectedShift.toLowerCase()}-${slug}.pdf`
          : `evotime-${vision}-oficial-${slug}.pdf`;

      await generateAndDownloadOfficialPdf(pdfDocumentProps, fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch {
      // Fallback
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-100">
      {/* Barra de Navegação Superior */}
      <Topbar />

      {/* Layout Split Screen: Painel de Controle à Esquerda | <PDFViewer> Vetorial à Direita */}
      <div className="flex-1 h-[calc(100vh-70px)] flex flex-col lg:flex-row overflow-hidden">
        {/* COLUNA DA ESQUERDA (35%): PAINEL DE CONTROLE E FILTROS AVANÇADOS */}
        <aside
          aria-label="Painel de Controle do PDF Vetorial"
          className="w-full lg:w-[35%] h-full bg-white border-r border-slate-200/90 flex flex-col justify-between overflow-hidden shrink-0"
        >
          {/* Área de Filtros com Scroll Interno Invisível */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] p-6 space-y-6">
            {/* Cabeçalho do Painel */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-[11px] font-bold text-indigo-700 mb-2">
                <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Motor Vetorial @react-pdf/renderer</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Painel de Exportação Oficial
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Geração de PDF vetorial nativo (A4 Paisagem) com texto
                selecionável e paginação automática.
              </p>
            </div>

            {/* 1. SELECT PRINCIPAL: VISÃO DO RELATÓRIO */}
            <div className="space-y-2">
              <label
                htmlFor="report-vision-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Visão do Relatório
              </label>
              <div className="relative">
                <select
                  id="report-vision-select"
                  value={vision}
                  onChange={(e) =>
                    handleChangeVision(e.target.value as VectorReportVision)
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  <option value="turmas">Grade por Turmas</option>
                  <option value="professores">Grade por Professores</option>
                  <option value="mapa_geral">Mapa Geral da Escola</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                {vision === "turmas" &&
                  "Gera tabelas vetoriais individuais para cada turma selecionada."}
                {vision === "professores" &&
                  "Gera o horário consolidado de aulas e turmas por docente."}
                {vision === "mapa_geral" &&
                  "Cruza todas as turmas e professores de um turno em uma única visão expandida."}
              </p>
            </div>

            {/* 2A. FILTRO DE TURNO (Exibido quando "Mapa Geral da Escola" está selecionado) */}
            {vision === "mapa_geral" ? (
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <label
                      htmlFor="shift-select"
                      className="text-xs font-bold uppercase tracking-wider text-indigo-950"
                    >
                      Selecionar Turno do Mapa Geral
                    </label>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {shiftTurmas.length} turmas cruzadas
                  </span>
                </div>

                {/* Botões Rápidos + Select de Turno (Manhã, Tarde, Noite) */}
                <div className="grid grid-cols-3 gap-2">
                  {(["Manhã", "Tarde", "Noite"] as ShiftOption[]).map(
                    (shift) => {
                      const isActive = selectedShift === shift;
                      return (
                        <button
                          key={shift}
                          type="button"
                          onClick={() => setSelectedShift(shift)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isActive
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                              : "bg-white hover:bg-indigo-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {shift}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="pt-2 border-t border-indigo-200/60 flex items-center gap-2 text-[11px] text-indigo-900">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Turmas no cruzamento:{" "}
                    <strong>
                      {shiftTurmas.map((t) => t.name).join(", ")}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              /* 2B. SELEÇÃO MÚLTIPLA DE TURMAS OU PROFESSORES */
              <div className="space-y-2.5" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    {vision === "turmas"
                      ? "Turmas Incluídas no PDF"
                      : "Professores Incluídos no PDF"}
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600">
                    {selectedSheets.length} selecionada(s)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds(availableItems.map((i) => i.id))
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      selectedIds.length === availableItems.length
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    }`}
                  >
                    Todas ({availableItems.length})
                  </button>

                  {vision === "turmas" && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIds(
                          ALL_TURMAS_SHEETS.filter(
                            (t) => t.yearGroup === "1º Ano"
                          ).map((t) => t.id)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 transition-colors cursor-pointer"
                    >
                      Apenas 1º Ano
                    </button>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {selectedSheets.length === availableItems.length
                          ? `Todas selecionadas (${availableItems.length})`
                          : selectedSheets.map((s) => s.name).join(", ")}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Clique para selecionar os itens do lote vetorial
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                        isDropdownOpen ? "rotate-180 text-indigo-600" : ""
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="mt-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-lg space-y-1 max-h-48 overflow-y-auto z-30">
                      {availableItems.map((item) => {
                        const isChecked = selectedIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItemSelection(item.id)}
                            className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between gap-2 text-xs font-semibold transition-colors cursor-pointer ${
                              isChecked
                                ? "bg-indigo-50 text-indigo-950"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span className="truncate">
                              {item.name} ({item.shift})
                            </span>
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                isChecked
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isChecked && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. OPÇÕES DO TEMPLATE VETORIAL PREMIUM */}
            <div className="space-y-3 pt-2 border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Parâmetros do Template PDF
                </span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: "vec-grayscale",
                    label: "Imprimir em Tons de Cinza (Economia de Tinta)",
                    desc: "Substitui as cores pastéis por alto contraste corporativo",
                    checked: grayscaleMode,
                    onChange: () => setGrayscaleMode((v) => !v),
                  },
                  {
                    id: "vec-weekends",
                    label: "Ocultar finais de semana",
                    desc: "Renderiza colunas de Segunda a Sexta-feira no PDF",
                    checked: hideWeekends,
                    onChange: () => setHideWeekends((v) => !v),
                  },
                  {
                    id: "vec-teacher",
                    label: "Mostrar nome do professor nas células",
                    desc: "Exibe o docente abaixo de cada disciplina no vetor",
                    checked: showTeacherName,
                    onChange: () => setShowTeacherName((v) => !v),
                  },
                  {
                    id: "vec-pagebreak",
                    label: "Paginação individual por turma (wrap={true})",
                    desc: "Cria novas páginas automaticamente sem cortar tabelas",
                    checked: forcePageBreak,
                    onChange: () => setForcePageBreak((v) => !v),
                  },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={opt.onChange}
                    role="switch"
                    aria-checked={opt.checked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        opt.onChange();
                      }
                    }}
                    className="p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {opt.desc}
                      </p>
                    </div>

                    <div
                      className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        opt.checked ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          opt.checked ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RODAPÉ FIXO DA ESQUERDA: BOTÃO "BAIXAR PDF OFICIAL" */}
          <div className="p-5 bg-white border-t border-slate-200/90 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="inline-flex items-center gap-1 font-semibold">
                <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                PDF Vetorial • Texto Selecionável
              </span>
              <span>A4 Paisagem (wrap=true)</span>
            </div>

            {downloadSuccess && (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PDF Oficial gerado e baixado com sucesso!</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadOfficialPdf}
              disabled={isDownloading}
              className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compilando Vetores PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Oficial</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* COLUNA DA DIREITA (65%): <PDFViewer> REAL DO @react-pdf/renderer */}
        <main
          aria-label="Visualizador de PDF Vetorial em Tempo Real"
          className="w-full lg:w-[65%] h-full bg-slate-200 p-4 flex flex-col overflow-hidden"
        >
          <div className="mb-2.5 px-3 py-2 rounded-xl bg-white/90 border border-slate-300/80 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                PDFViewer Vetorial Nativo • {activeSchool.name}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {vision === "mapa_geral"
                ? `Mapa Geral da Escola • Turno: ${selectedShift}`
                : `${selectedSheets.length} tabela(s) vetorial(is) ativa(s)`}
            </span>
          </div>

          <VectorPdfClientStudio {...pdfDocumentProps} />
        </main>
      </div>
    </div>
  );
}
