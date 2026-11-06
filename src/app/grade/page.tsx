"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Toaster, toast } from "sonner";
import Topbar from "@/components/Topbar";
import InfeasibilityReportModal from "@/components/InfeasibilityReportModal";
import type {
  SolverJobState,
  UnfeasibleConflictItem,
} from "@/lib/solver/jobStore";
import {
  SCHOOLS_LIST,
  ACTIVE_SCHOOL_STORAGE_KEY,
  SCHOOLS_STORAGE_KEY,
  CLASSES_STORAGE_KEY,
  TEACHERS_STORAGE_KEY,
  FALLBACK_EMPTY_SCHOOL,
  SchoolTenant,
} from "@/lib/schoolData";
import {
  Sparkles,
  Filter,
  GraduationCap,
  UserCheck,
  GripVertical,
  Calendar,
  Coffee,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Cpu,
  Move,
  Clock,
  Settings2,
} from "lucide-react";

type SubjectTone =
  | "blue"
  | "emerald"
  | "amber"
  | "purple"
  | "teal"
  | "orange";

interface LessonBlock {
  id: string;
  subject: string;
  teacher: string;
  tone: SubjectTone;
  hasConflict?: boolean;
  conflictReason?: string;
}

type DayKey = "seg" | "ter" | "qua" | "qui" | "sex";

interface DayColumnConfig {
  key: DayKey;
  dayIndex: number; // 0 a 4
  dayNumber: number; // 1 a 5 (para slot_dia_X)
  slotPrefix: string;
  label: string;
  full: string;
}

const DAYS: DayColumnConfig[] = [
  {
    key: "seg",
    dayIndex: 0,
    dayNumber: 1,
    slotPrefix: "segunda",
    label: "Segunda",
    full: "Segunda-feira",
  },
  {
    key: "ter",
    dayIndex: 1,
    dayNumber: 2,
    slotPrefix: "terca",
    label: "Terça",
    full: "Terça-feira",
  },
  {
    key: "qua",
    dayIndex: 2,
    dayNumber: 3,
    slotPrefix: "quarta",
    label: "Quarta",
    full: "Quarta-feira",
  },
  {
    key: "qui",
    dayIndex: 3,
    dayNumber: 4,
    slotPrefix: "quinta",
    label: "Quinta",
    full: "Quinta-feira",
  },
  {
    key: "sex",
    dayIndex: 4,
    dayNumber: 5,
    slotPrefix: "sexta",
    label: "Sexta",
    full: "Sexta-feira",
  },
];

/**
 * Gera o identificador único do Slot Droppable cruzando Dia da Semana e Período
 * Exemplo estrito do prompt: "slot_dia_1_aula_4", "slot_dia_2_aula_2"
 */
function buildSlotId(
  dayNumberOrKey: number | DayKey,
  aulaNumero: number
): string {
  let dayNum = 1;
  if (typeof dayNumberOrKey === "number") {
    dayNum = dayNumberOrKey;
  } else {
    const found = DAYS.find((d) => d.key === dayNumberOrKey);
    dayNum = found ? found.dayNumber : 1;
  }
  return `slot_dia_${dayNum}_aula_${aulaNumero}`;
}

/**
 * Faz o parse reverso do identificador do slot para obter dia e aula
 */
function parseSlotId(
  slotId: string
): { dayKey: DayKey; dayNumber: number; dayIndex: number; aulaNumero: number } | null {
  // Padrão do prompt: slot_dia_1_aula_4
  const match = slotId.match(/^slot_dia_(\d+)_aula_(\d+)$/);
  if (match) {
    const dayNumber = parseInt(match[1], 10);
    const aulaNumero = parseInt(match[2], 10);
    const dayIndex = Math.max(0, Math.min(DAYS.length - 1, dayNumber - 1));
    const dayKey = DAYS[dayIndex]?.key || "seg";
    return { dayKey, dayNumber, dayIndex, aulaNumero };
  }

  // Fallback de compatibilidade (ex: segunda_aula_1)
  for (const day of DAYS) {
    if (slotId.startsWith(`${day.slotPrefix}_aula_`)) {
      const numStr = slotId.replace(`${day.slotPrefix}_aula_`, "");
      const aulaNumero = parseInt(numStr, 10) || 1;
      return {
        dayKey: day.key,
        dayNumber: day.dayNumber,
        dayIndex: day.dayIndex,
        aulaNumero,
      };
    }
  }

  return null;
}

const TONE_STYLES: Record<
  SubjectTone,
  {
    bg: string;
    border: string;
    title: string;
    subtitle: string;
    dot: string;
  }
> = {
  blue: {
    bg: "bg-blue-50/90 hover:bg-blue-50",
    border: "border-blue-200/90 hover:border-blue-300",
    title: "text-blue-950",
    subtitle: "text-blue-700",
    dot: "bg-blue-500",
  },
  emerald: {
    bg: "bg-emerald-50/90 hover:bg-emerald-50",
    border: "border-emerald-200/90 hover:border-emerald-300",
    title: "text-emerald-950",
    subtitle: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  amber: {
    bg: "bg-amber-50/90 hover:bg-amber-50",
    border: "border-amber-200/90 hover:border-amber-300",
    title: "text-amber-950",
    subtitle: "text-amber-800",
    dot: "bg-amber-500",
  },
  purple: {
    bg: "bg-purple-50/90 hover:bg-purple-50",
    border: "border-purple-200/90 hover:border-purple-300",
    title: "text-purple-950",
    subtitle: "text-purple-700",
    dot: "bg-purple-500",
  },
  teal: {
    bg: "bg-teal-50/90 hover:bg-teal-50",
    border: "border-teal-200/90 hover:border-teal-300",
    title: "text-teal-950",
    subtitle: "text-teal-700",
    dot: "bg-teal-500",
  },
  orange: {
    bg: "bg-orange-50/90 hover:bg-orange-50",
    border: "border-orange-200/90 hover:border-orange-300",
    title: "text-orange-950",
    subtitle: "text-orange-800",
    dot: "bg-orange-500",
  },
};

/**
 * Regras de Simulação em Tempo Real para o Motor de Validação onDragEnd:
 * 1. Indisponibilidade na Matriz do Professor (ex: Professor Carlos na Terça • 2ª Aula -> slot_dia_2_aula_2)
 * 2. Alocação Simultânea em outra turma no mesmo dia e período
 */
const TEACHER_UNAVAILABLE_SLOTS: Record<string, string[]> = {
  "Professor Carlos": [
    "slot_dia_2_aula_2",
    "slot_dia_2_aula_3",
    "slot_dia_4_aula_5",
    "terca_aula_2",
  ],
  "Prof. Ricardo Almeida": [
    "slot_dia_5_aula_1",
    "slot_dia_5_aula_2",
    "slot_dia_3_aula_1",
  ],
  "Profa. Camila Rocha": [
    "slot_dia_1_aula_4",
    "slot_dia_1_aula_5",
    "slot_dia_5_aula_6",
  ],
  "Prof. André Santos": ["slot_dia_2_aula_1", "slot_dia_4_aula_6"],
  "Profa. Helena Costa": ["slot_dia_3_aula_2", "slot_dia_3_aula_3"],
  "Prof. Marcelo Viana": ["slot_dia_4_aula_1", "slot_dia_4_aula_2"],
};

const TEACHER_SIMULTANEOUS_CLASS_CLASH: Record<
  string,
  Record<string, string>
> = {
  "Prof. André Santos": {
    slot_dia_1_aula_2: "2º Ano B",
    slot_dia_3_aula_4: "3º Ano A",
    segunda_aula_2: "2º Ano B",
  },
  "Professor Carlos": {
    slot_dia_4_aula_2: "3º Ano A",
  },
  "Profa. Patrícia Lima": {
    slot_dia_1_aula_3: "2º Ano A",
  },
};

const DEFAULT_FALLBACK_CONFLICTS: UnfeasibleConflictItem[] = [
  {
    id: "conflict-carlos-mat",
    bottleneckType: "workload_shortage",
    bottleneckLabel: "Falta de Carga Horária Disponível",
    teacherName: "Prof. Carlos",
    subject: "Matemática",
    targetClass: "3º Ano",
    deficitSlots: 4,
    suggestedDay: "Terça e Quinta",
    message:
      "Faltam 4 aulas disponíveis para o professor Carlos (Matemática) cobrir a demanda do 3º Ano.",
    detail:
      "A matriz curricular do 3º Ano exige 6 aulas semanais de Matemática, mas o Prof. Carlos possui apenas 2 períodos livres compatíveis no turno.",
    suggestions: [
      {
        id: "act-carlos-1",
        label: "Ver disponibilidade do Carlos",
        actionType: "view_availability",
        href: "/professores",
      },
      {
        id: "act-carlos-2",
        label: "Transferir 4 aulas de Matemática para outro professor",
        actionType: "transfer_workload",
        badge: "Recomendado pela IA",
      },
      {
        id: "act-carlos-3",
        label: "Permitir que Carlos dê 3 aulas seguidas (Exceção)",
        actionType: "allow_exception",
      },
    ],
  },
  {
    id: "conflict-andre-fis",
    bottleneckType: "direct_availability_clash",
    bottleneckLabel: "Choque Direto de Disponibilidade",
    teacherName: "Prof. André Santos",
    subject: "Física",
    targetClass: "1º Ano A e 2º Ano B",
    deficitSlots: 2,
    suggestedDay: "Segunda e Terça-feira",
    message:
      "Choque direto de disponibilidade: o professor André Santos (Física) possui os mesmos 2 horários livres disputados pelo 1º Ano A e 2º Ano B.",
    detail:
      "Ambos os cursos exigem Física na Segunda-feira (2ª Aula), onde o docente já está alocado.",
    suggestions: [
      {
        id: "act-andre-1",
        label: "Ver disponibilidade do André Santos",
        actionType: "view_availability",
        href: "/professores",
      },
      {
        id: "act-andre-2",
        label: "Transferir 2 aulas de Física para outro professor",
        actionType: "transfer_workload",
      },
      {
        id: "act-andre-3",
        label: "Permitir que André dê 3 aulas seguidas (Exceção)",
        actionType: "allow_exception",
        badge: "Destrava o Turno",
      },
    ],
  },
  {
    id: "conflict-camila-bio",
    bottleneckType: "consecutive_limit_lock",
    bottleneckLabel: "Restrição de Aulas Seguidas",
    teacherName: "Profa. Camila Rocha",
    subject: "Biologia",
    targetClass: "2º Ano B",
    deficitSlots: 1,
    suggestedDay: "Sexta-feira",
    message:
      "Falta 1 slot compatível para a professora Camila (Biologia) concluir a carga do 2º Ano B sem ultrapassar o limite de 2 aulas seguidas.",
    detail:
      "A Profa. Camila tem 3 horários livres contínuos na Sexta-feira, mas a trava atual impede 3 aulas consecutivas na mesma turma.",
    suggestions: [
      {
        id: "act-camila-1",
        label: "Ver disponibilidade da Camila",
        actionType: "view_availability",
        href: "/professores",
      },
      {
        id: "act-camila-2",
        label: "Permitir que Camila dê 3 aulas seguidas (Exceção)",
        actionType: "allow_exception",
        badge: "Solução Instantânea",
      },
      {
        id: "act-camila-3",
        label: "Transferir 1 aula de Biologia para outro professor",
        actionType: "transfer_workload",
      },
    ],
  },
];

/**
 * Gera a matriz inicial de aulas mapeadas diretamente por seus slot_ids dinâmicos
 * Retorna um mapa 100% vazio pronto para o Drag-and-Drop e o Motor de Otimização IA
 */
function getInitialLessonsMap(): Record<string, LessonBlock> {
  return {};
}

/**
 * Visual puro do Bloco de Aula
 */
function LessonCardVisual({
  lesson,
  isFilteredOut,
  isOverlay = false,
  isShaking = false,
  isApprovedGlow = false,
}: {
  lesson: LessonBlock;
  isFilteredOut?: boolean;
  isOverlay?: boolean;
  isShaking?: boolean;
  isApprovedGlow?: boolean;
}) {
  const style = TONE_STYLES[lesson.tone];

  return (
    <div
      title={lesson.conflictReason}
      className={`w-full h-full min-h-[88px] rounded-xl p-3 flex flex-col justify-between select-none transition-all duration-200 ${
        isOverlay
          ? "shadow-2xl scale-[1.03] rotate-1 cursor-grabbing ring-2 ring-indigo-500/40 bg-white"
          : "cursor-grab active:cursor-grabbing shadow-xs hover:shadow-md"
      } ${
        lesson.hasConflict
          ? "bg-red-50 border-2 border-red-500 text-red-950"
          : isApprovedGlow
          ? `bg-emerald-50/70 border border-emerald-400 ring-2 ring-emerald-400`
          : `bg-white border ${style.bg} ${style.border}`
      } ${isShaking ? "animate-shake" : ""} ${
        isFilteredOut && !isOverlay ? "opacity-25 saturate-50" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        {lesson.hasConflict ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 animate-pulse" />
            <span>Conflito</span>
          </span>
        ) : isApprovedGlow ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Validado</span>
          </span>
        ) : (
          <span className={`w-2 h-2 rounded-full mt-1 ${style.dot}`} />
        )}

        <GripVertical
          className={`w-4 h-4 opacity-45 group-hover:opacity-90 transition-opacity ${
            lesson.hasConflict ? "text-red-700" : style.subtitle
          }`}
        />
      </div>

      <div className="mt-1.5">
        <h3
          className={`text-sm font-bold leading-snug ${
            lesson.hasConflict ? "text-red-950" : style.title
          }`}
        >
          {lesson.subject}
        </h3>
        <p
          className={`text-xs font-medium mt-0.5 truncate ${
            lesson.hasConflict ? "text-red-700" : style.subtitle
          }`}
        >
          {lesson.teacher}
        </p>
      </div>

      {lesson.hasConflict && (
        <div className="mt-1.5 pt-1 border-t border-red-200/90 flex items-center gap-1 text-[10px] font-semibold text-red-700">
          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
          <span className="truncate">
            {lesson.conflictReason || "Violação de regra"}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Componente Draggable (Bloco de Aula Arrastável)
 */
function DraggableLessonBlock({
  lesson,
  slotId,
  isFilteredOut,
  isShaking,
  isApprovedGlow,
}: {
  lesson: LessonBlock;
  slotId: string;
  isFilteredOut: boolean;
  isShaking: boolean;
  isApprovedGlow: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lesson.id,
      data: {
        lesson,
        fromSlotId: slotId,
      },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group w-full h-full touch-none transition-opacity duration-150 ${
        isDragging ? "opacity-30 scale-[0.97] z-10" : "opacity-100"
      }`}
    >
      <LessonCardVisual
        lesson={lesson}
        isFilteredOut={isFilteredOut}
        isShaking={isShaking}
        isApprovedGlow={isApprovedGlow}
      />
    </div>
  );
}

/**
 * Área Recebedora (Droppable Slot) com ID único: ex. "slot_dia_1_aula_4"
 */
function DroppableSlotCell({
  slotId,
  children,
  isEmpty,
}: {
  slotId: string;
  children?: React.ReactNode;
  isEmpty: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
  });

  return (
    <div
      ref={setNodeRef}
      data-slot-id={slotId}
      className={`p-2.5 border-r last:border-r-0 border-slate-200/60 flex min-h-[108px] transition-all duration-150 ${
        isOver
          ? "bg-indigo-50/80 ring-2 ring-inset ring-indigo-500/60"
          : isEmpty
          ? "bg-slate-50/40 hover:bg-slate-100/50"
          : "bg-white"
      }`}
    >
      {isEmpty ? (
        <div
          className={`w-full h-full min-h-[88px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-colors ${
            isOver
              ? "border-indigo-400 bg-indigo-50/60 text-indigo-700"
              : "border-slate-200 text-slate-400"
          }`}
        >
          <Move className="w-3.5 h-3.5 mb-1 opacity-60" />
          <span className="text-[10px] font-semibold">Horário Livre</span>
          <code className="text-[9px] text-slate-400 mt-0.5">{slotId}</code>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function GradePage() {
  // Contexto da Escola Ativa
  const [activeSchool, setActiveSchool] = useState<SchoolTenant>(
    SCHOOLS_LIST[0] || FALLBACK_EMPTY_SCHOOL
  );

  // 1. LEITURA DE CONTEXTO: Duas variáveis de configuração do turno
  // quantidade_aulas_dia (ex: 5) e posicao_intervalo (ex: após a 3ª aula)
  const [quantidade_aulas_dia, setQuantidadeAulasDia] = useState<number>(5);
  const [posicao_intervalo, setPosicaoIntervalo] = useState<number>(3);
  const [activeShiftName, setActiveShiftName] = useState<string>("Matutino");

  // Estado das Aulas indexadas diretamente pelos identificadores dos slots
  const [lessonsMap, setLessonsMap] = useState<Record<string, LessonBlock>>(
    () => getInitialLessonsMap()
  );

  const [turmasList, setTurmasList] = useState<string[]>([]);
  const [professoresList, setProfessoresList] = useState<string[]>([
    "Todos os Professores",
  ]);
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedProfessor, setSelectedProfessor] = useState<string>(
    "Todos os Professores"
  );

  // Estados do Drag-and-Drop e Feedback Visual
  const [activeDraggedLesson, setActiveDraggedLesson] =
    useState<LessonBlock | null>(null);
  const [shakingLessonId, setShakingLessonId] = useState<string | null>(null);
  const [approvedLessonId, setApprovedLessonId] = useState<string | null>(null);

  // Estado do Job Assíncrono + Polling (a cada 3 segundos)
  const [activeJob, setActiveJob] = useState<SolverJobState | null>(null);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] =
    useState<boolean>(false);
  const [appliedFixesSummary, setAppliedFixesSummary] = useState<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPolling();
  }, []);

  // Leitura dinâmica do Contexto da Escola Ativa e Configurações de Turno
  useEffect(() => {
    const syncSchoolAndShiftConfig = () => {
      try {
        let currentList = SCHOOLS_LIST;
        const savedList = localStorage.getItem(SCHOOLS_STORAGE_KEY);
        if (savedList) {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentList = parsed;
          }
        }

        const savedActiveId = localStorage.getItem(ACTIVE_SCHOOL_STORAGE_KEY);
        const school =
          (currentList.length > 0
            ? currentList.find((s) => s.id === savedActiveId) || currentList[0]
            : null) || FALLBACK_EMPTY_SCHOOL;
        setActiveSchool(school);

        // Carrega Turmas e Professores do LocalStorage se existirem
        const savedCls = localStorage.getItem(CLASSES_STORAGE_KEY);
        if (savedCls) {
          const parsedCls = JSON.parse(savedCls);
          if (Array.isArray(parsedCls) && parsedCls.length > 0) {
            const names = parsedCls.map((c: { name: string }) => c.name);
            setTurmasList(names);
            setSelectedTurma((prev) => prev || names[0]);
          }
        }

        const savedTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
        if (savedTeachers) {
          const parsedT = JSON.parse(savedTeachers);
          if (Array.isArray(parsedT) && parsedT.length > 0) {
            const pNames = [
              "Todos os Professores",
              ...parsedT.map((t: { name: string }) => t.name),
            ];
            setProfessoresList(pNames);
          }
        }

        // Identifica o turno da turma selecionada
        const isTarde = selectedTurma.toLowerCase().includes("tarde") ||
          selectedTurma.includes("2º Ano B");
        const isNoite = selectedTurma.toLowerCase().includes("noite");
        const shiftKey = isNoite ? "noite" : isTarde ? "tarde" : "manha";
        setActiveShiftName(isNoite ? "Noturno" : isTarde ? "Vespertino" : "Matutino");

        // Lê as configurações do turno salvas para a instituição em /configuracoes
        const savedConfigStr = localStorage.getItem(`evotime_config_${school.id}`);
        if (savedConfigStr) {
          const config = JSON.parse(savedConfigStr);
          const shiftConfig = config?.shifts?.[shiftKey];
          if (shiftConfig) {
            if (typeof shiftConfig.slotsCount === "number" && shiftConfig.slotsCount >= 3) {
              setQuantidadeAulasDia(shiftConfig.slotsCount);
            }
            if (typeof shiftConfig.breakAfterSlot === "number" && shiftConfig.breakAfterSlot >= 1) {
              setPosicaoIntervalo(shiftConfig.breakAfterSlot);
            }
          }
        } else {
          // Valores padrão se ainda não configurado
          if (isNoite) {
            setQuantidadeAulasDia(4);
            setPosicaoIntervalo(2);
          } else {
            setQuantidadeAulasDia(5);
            setPosicaoIntervalo(3);
          }
        }
      } catch {
        // Fallback
      }
    };

    syncSchoolAndShiftConfig();
    window.addEventListener("evotime:school-change", syncSchoolAndShiftConfig);
    window.addEventListener("evotime:schools-updated", syncSchoolAndShiftConfig);
    return () => {
      window.removeEventListener("evotime:school-change", syncSchoolAndShiftConfig);
      window.removeEventListener("evotime:schools-updated", syncSchoolAndShiftConfig);
    };
  }, [selectedTurma]);

  // 2. RENDERIZAÇÃO COM .MAP(): Cria o array dinâmico baseado em quantidade_aulas_dia
  const aulasArray = useMemo(() => {
    const count = Math.max(1, Math.min(10, quantidade_aulas_dia));
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [quantidade_aulas_dia]);

  /**
   * Simulação de Regras no onDragEnd:
   * 1. O professor já está dando aula em outra turma neste mesmo dia e período?
   * 2. Este professor bloqueou este dia/horário na sua matriz de disponibilidade?
   * 3. Esse movimento cria 3 aulas seguidas da mesma matéria?
   */
  const validateLessonInTargetSlot = (
    movedLesson: LessonBlock,
    targetSlotId: string,
    candidateLessonsMap: Record<string, LessonBlock>
  ): { isValid: boolean; errorMessage?: string } => {
    const parsed = parseSlotId(targetSlotId);
    if (!parsed) return { isValid: true };

    const dayObj = DAYS[parsed.dayIndex];
    const dayLabel = dayObj ? dayObj.label : `Dia ${parsed.dayNumber}`;
    const periodLabel = `${parsed.aulaNumero}ª Aula`;

    // REGRA 1: Este professor bloqueou este dia/horário na sua Matriz de Disponibilidade?
    const blockedSlots = TEACHER_UNAVAILABLE_SLOTS[movedLesson.teacher] || [];
    if (blockedSlots.includes(targetSlotId)) {
      return {
        isValid: false,
        errorMessage: `Atenção: O ${movedLesson.teacher} não tem disponibilidade na ${dayLabel} (${periodLabel}).`,
      };
    }

    // REGRA 2: O professor já está dando aula em outra turma neste mesmo dia e período?
    const teacherClashes =
      TEACHER_SIMULTANEOUS_CLASS_CLASH[movedLesson.teacher] || {};
    if (teacherClashes[targetSlotId]) {
      const otherClass = teacherClashes[targetSlotId];
      return {
        isValid: false,
        errorMessage: `Atenção: O ${movedLesson.teacher} já está dando aula no ${otherClass} na ${dayLabel} (${periodLabel}).`,
      };
    }

    // REGRA 3: Esse movimento cria 3 aulas seguidas da mesma matéria no mesmo dia?
    // Analisa as aulas consecutivas no dia da aula movida
    for (let a = 1; a <= quantidade_aulas_dia - 2; a++) {
      const s1 = candidateLessonsMap[buildSlotId(parsed.dayNumber, a)]?.subject;
      const s2 = candidateLessonsMap[buildSlotId(parsed.dayNumber, a + 1)]?.subject;
      const s3 = candidateLessonsMap[buildSlotId(parsed.dayNumber, a + 2)]?.subject;
      if (s1 && s1 === s2 && s2 === s3 && s1 === movedLesson.subject) {
        return {
          isValid: false,
          errorMessage: `Atenção: Este movimento cria 3 aulas seguidas de ${movedLesson.subject} na ${dayLabel} (limite máximo: 2 seguidas).`,
        };
      }
    }

    return { isValid: true };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const lesson = event.active.data.current?.lesson as LessonBlock | undefined;
    if (lesson) {
      setActiveDraggedLesson(lesson);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDraggedLesson(null);
    const { active, over } = event;
    if (!over) return;

    const fromSlotId = active.data.current?.fromSlotId as string | undefined;
    const toSlotId = String(over.id);

    if (!fromSlotId || fromSlotId === toSlotId) return;

    const fromParsed = parseSlotId(fromSlotId);
    const toParsed = parseSlotId(toSlotId);
    if (!fromParsed || !toParsed) return;

    const nextLessonsMap = { ...lessonsMap };
    const movedLesson = nextLessonsMap[fromSlotId];
    if (!movedLesson) return;

    const displacedLesson = nextLessonsMap[toSlotId];

    // Realiza o encaixe no novo slot (e faz swap se já houver aula no destino)
    if (displacedLesson) {
      nextLessonsMap[fromSlotId] = {
        ...displacedLesson,
        hasConflict: false,
        conflictReason: undefined,
      };
    } else {
      delete nextLessonsMap[fromSlotId];
    }

    nextLessonsMap[toSlotId] = { ...movedLesson };

    // Validação de regras em tempo real
    const validation = validateLessonInTargetSlot(
      movedLesson,
      toSlotId,
      nextLessonsMap
    );

    if (!validation.isValid) {
      // Estado de alerta crítico
      nextLessonsMap[toSlotId] = {
        ...movedLesson,
        hasConflict: true,
        conflictReason: validation.errorMessage,
      };
      setLessonsMap(nextLessonsMap);

      setShakingLessonId(movedLesson.id);
      setTimeout(() => {
        setShakingLessonId((curr) => (curr === movedLesson.id ? null : curr));
      }, 650);

      toast.error(validation.errorMessage, {
        description: `Slot: ${toSlotId} • A aula foi encaixada em estado de alerta crítico.`,
        duration: 5000,
      });
    } else {
      // Movimento aprovado com brilho verde
      nextLessonsMap[toSlotId] = {
        ...movedLesson,
        hasConflict: false,
        conflictReason: undefined,
      };
      setLessonsMap(nextLessonsMap);

      setApprovedLessonId(movedLesson.id);
      setTimeout(() => {
        setApprovedLessonId((curr) => (curr === movedLesson.id ? null : curr));
      }, 1000);

      const dayObj = DAYS[toParsed.dayIndex];
      toast.success(
        `Alocação validada: ${movedLesson.subject} (${movedLesson.teacher}) em ${dayObj?.label} • ${toParsed.aulaNumero}ª Aula.`,
        { duration: 2500 }
      );
    }
  };

  // Contagem de conflitos ativos
  const totalConflictsCount = useMemo(() => {
    return Object.values(lessonsMap).filter((l) => l.hasConflict).length;
  }, [lessonsMap]);

  // Polling e Solver Assíncrono
  const startAsyncOptimization = async (mode: "optimal" | "unfeasible") => {
    clearPolling();
    if (mode === "unfeasible") {
      setAppliedFixesSummary([]);
    }

    try {
      let savedConstraints = {
        bloquearAulasGeminadas: true,
        avoidGaps: true,
        enforceMaxTwoConsecutive: true,
      };
      try {
        const raw = localStorage.getItem(`evotime_config_${activeSchool.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.aiRules) {
            savedConstraints = {
              bloquearAulasGeminadas:
                parsed.aiRules.bloquearAulasGeminadas !== false,
              avoidGaps: !parsed.aiRules.allowTeacherGaps,
              enforceMaxTwoConsecutive:
                parsed.aiRules.enforceMaxTwoConsecutive !== false,
            };
          }
        }
      } catch {
        // Fallback para hard constraints ativadas
      }

      const res = await fetch("/api/grade/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turma: selectedTurma,
          mode,
          constraints: savedConstraints,
        }),
      });

      const data = await res.json();
      if (!data.job_id) return;

      setActiveJob({
        job_id: data.job_id,
        school_id: data.school_id || activeSchool.id || "santa-maria",
        turma: selectedTurma,
        mode,
        status: "processing",
        createdAt: Date.now(),
        progress: data.progress || 15,
        stageMessage:
          data.stageMessage ||
          "Cruzando disponibilidades docentes e matrizes curriculares...",
      });

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/grade/status?job_id=${encodeURIComponent(data.job_id)}`
          );
          if (!statusRes.ok) return;

          const jobState: SolverJobState = await statusRes.json();
          setActiveJob(jobState);

          if (jobState.status === "completed") {
            clearPolling();
            // Limpa todos os conflitos da grade
            setLessonsMap((prev) => {
              const cleaned: Record<string, LessonBlock> = {};
              for (const [k, v] of Object.entries(prev)) {
                cleaned[k] = {
                  ...v,
                  hasConflict: false,
                  conflictReason: undefined,
                };
              }
              return cleaned;
            });
            toast.success("Grade otimizada com sucesso pelo Google OR-Tools CP-SAT!");
          } else if (jobState.status === "unfeasible") {
            clearPolling();
            setIsDiagnosticModalOpen(true);
          }
        } catch {
          // Continua o polling
        }
      }, 3000);
    } catch {
      // Ignora erro
    }
  };

  const handleReoptimizeWithFixes = (appliedActions: Record<string, string>) => {
    setIsDiagnosticModalOpen(false);
    const chosenLabels = Object.values(appliedActions);
    setAppliedFixesSummary(
      chosenLabels.length > 0
        ? chosenLabels
        : ["Ajustes recomendados pelo Assistente IA aplicados"]
    );
    startAsyncOptimization("optimal");
  };

  const handleResetSimulation = () => {
    clearPolling();
    setActiveJob(null);
    setAppliedFixesSummary([]);
    setIsDiagnosticModalOpen(false);
    setLessonsMap(getInitialLessonsMap());
  };

  const isProcessing = activeJob?.status === "processing";
  const currentConflicts =
    activeJob?.unfeasibleReport?.conflicts || DEFAULT_FALLBACK_CONFLICTS;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Notificações Toast (Sonner) */}
      <Toaster richColors position="top-right" closeButton />

      {/* Topbar Superior com Seletor Multi-Escola */}
      <Topbar />

      {/* Container Centralizado */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-600 mb-2.5 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                Grade IA • Renderização Dinâmica com Slots Variáveis
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Matriz de Horários (Slots Dinâmicos)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Linhas geradas via <code>.map()</code> baseadas nas configurações
              do turno da escola ativa ({activeSchool.name}).
            </p>
          </div>

          {/* Indicador de Status de Conflito */}
          <div className="flex flex-wrap items-center gap-2">
            {totalConflictsCount === 0 ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>0 Choques na Grade</span>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="ml-2 inline-flex items-center gap-1 text-indigo-600 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                <span>
                  {totalConflictsCount} Conflito(s) ativo(s) na Grade
                </span>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="ml-1.5 inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Resetar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Banner de Contexto do Turno Ativo (Leitura de Contexto: quantidade_aulas_dia e posicao_intervalo) */}
        <section
          aria-label="Contexto de Configuração de Turno"
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Estrutura de Turno: {activeShiftName} ({activeSchool.name})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                  Variáveis Reativas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                <code>quantidade_aulas_dia</code>:{" "}
                <strong className="text-slate-800">
                  {quantidade_aulas_dia} aulas
                </strong>{" "}
                • <code>posicao_intervalo</code>:{" "}
                <strong className="text-slate-800">
                  após a {posicao_intervalo}ª aula
                </strong>
              </p>
            </div>
          </div>

          {/* Controles Rápidos de Ajuste Fino em Tempo Real */}
          <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 px-1.5">
                Aulas/Dia:
              </span>
              {[4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantidadeAulasDia(num)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    quantidade_aulas_dia === num
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 px-1.5">
                Intervalo:
              </span>
              {[2, 3, 4, 5].map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosicaoIntervalo(pos)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    posicao_intervalo === pos
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {pos}ª
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Painel de Controle (Filtros + Botões do Motor IA) */}
        <section
          aria-label="Painel de Controle da Grade"
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtros</span>
            </div>

            {/* Select: Filtrar por Turma */}
            <div className="relative flex-1 max-w-xs">
              <label htmlFor="filter-turma" className="sr-only">
                Filtrar por Turma
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                    Filtrar por Turma
                  </p>
                  <select
                    id="filter-turma"
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer truncate"
                  >
                    {turmasList.length === 0 ? (
                      <option value="">Nenhuma turma cadastrada</option>
                    ) : (
                      turmasList.map((turma) => (
                        <option key={turma} value={turma}>
                          {turma}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Select: Filtrar por Professor */}
            <div className="relative flex-1 max-w-xs">
              <label htmlFor="filter-professor" className="sr-only">
                Filtrar por Professor
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                    Filtrar por Professor
                  </p>
                  <select
                    id="filter-professor"
                    value={selectedProfessor}
                    onChange={(e) => setSelectedProfessor(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer truncate"
                  >
                    {professoresList.map((prof) => (
                      <option key={prof} value={prof}>
                        {prof}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold transition-all cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Relatório de Ajustes IA</span>
            </button>

            <button
              type="button"
              onClick={() => startAsyncOptimization("unfeasible")}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Testar Fallback do Motor</span>
            </button>

            <button
              type="button"
              onClick={() => startAsyncOptimization("optimal")}
              disabled={isProcessing}
              className="group inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 animate-pulse" />
              )}
              <span>
                {isProcessing ? "Processando na Fila..." : "Otimizar com IA"}
              </span>
            </button>
          </div>
        </section>

        {/* Guia Rápido de Simulação Drag-and-Drop */}
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Identificadores de Slots Registrados:</strong> Arraste de{" "}
              <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-bold text-indigo-700">
                slot_dia_1_aula_1
              </code>{" "}
              para{" "}
              <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-bold text-indigo-700">
                slot_dia_1_aula_4
              </code>{" "}
              ou teste o bloqueio em{" "}
              <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-bold text-rose-700">
                slot_dia_2_aula_2
              </code>
              .
            </span>
          </div>
        </div>

        {/* Painel de Polling Assíncrono */}
        {activeJob && (
          <section
            aria-live="polite"
            className={`rounded-xl border p-5 shadow-sm transition-all duration-300 ${
              activeJob.status === "processing"
                ? "bg-indigo-950 text-white border-indigo-800"
                : activeJob.status === "unfeasible"
                ? "bg-amber-50/85 border-amber-200/90 text-slate-900"
                : "bg-emerald-50/90 border-emerald-300 text-emerald-950"
            }`}
          >
            {activeJob.status === "processing" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-800/80 border border-indigo-700 flex items-center justify-center shrink-0">
                      <Loader2 className="w-5 h-5 text-indigo-300 animate-spin" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                          Worker Assíncrono • Polling 3s
                        </span>
                        <code className="text-[11px] px-2 py-0.5 rounded bg-indigo-900 text-indigo-200 border border-indigo-700">
                          {activeJob.job_id}
                        </code>
                      </div>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {activeJob.stageMessage}
                      </p>
                    </div>
                  </div>

                  <span className="text-2xl font-extrabold text-indigo-300">
                    {activeJob.progress}%
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-indigo-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all duration-500 rounded-full"
                    style={{ width: `${activeJob.progress}%` }}
                  />
                </div>
              </div>
            )}

            {activeJob.status === "completed" && activeJob.metrics && (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-emerald-950">
                          {activeJob.stageMessage}
                        </h3>
                        <code className="text-[11px] px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                          {activeJob.job_id}
                        </code>
                      </div>
                      <p className="text-xs text-emerald-800 mt-1">
                        Motor:{" "}
                        <strong>{activeJob.metrics.solverEngine}</strong> •{" "}
                        {activeJob.metrics.branchesExplored.toLocaleString(
                          "pt-BR"
                        )}{" "}
                        ramificações avaliadas • Hard Constraints:{" "}
                        <strong>
                          {activeJob.metrics.hardConstraintsSatisfied}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveJob(null)}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  >
                    Fechar Relatório
                  </button>
                </div>

                {appliedFixesSummary.length > 0 && (
                  <div className="pt-2.5 border-t border-emerald-200/80 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-900">
                      Sugestões da IA aplicadas:
                    </span>
                    {appliedFixesSummary.map((fix, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {fix}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeJob.status === "unfeasible" &&
              activeJob.unfeasibleReport && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeJob.unfeasibleReport.title ||
                            "A Grade precisa de ajustes para ser finalizada"}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                          <Lightbulb className="w-3 h-3 text-amber-600" />
                          {activeJob.unfeasibleReport.conflicts.length} sugestões
                          prontas
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {activeJob.unfeasibleReport.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsDiagnosticModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-300" />
                      <span>Ver Sugestões da IA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveJob(null)}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-amber-100/70 text-slate-600 border border-amber-200 text-xs font-semibold cursor-pointer"
                    >
                      Ocultar
                    </button>
                  </div>
                </div>
              )}
          </section>
        )}

        {/* 3 e 4. TABELA COM RENDERIZAÇÃO DINÂMICA COM .MAP() E INTERVALO CONDICIONAL */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section
            aria-label="Grade Horária com Renderização Dinâmica"
            className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
                {/* Cabeçalho das Colunas (Período + Segunda a Sexta) */}
                <div className="grid grid-cols-[135px_repeat(5,minmax(0,1fr))] bg-slate-50/90 border-b border-slate-200/80">
                  <div className="p-4 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200/70">
                    Período
                  </div>
                  {DAYS.map((day) => (
                    <div
                      key={day.key}
                      className="p-4 text-center border-r last:border-r-0 border-slate-200/70"
                    >
                      <span className="block text-sm font-bold text-slate-800">
                        {day.label}
                      </span>
                      <span className="block text-[11px] font-medium text-slate-400">
                        {day.full}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Linhas da Tabela Geradas Dinamicamente via .map() */}
                <div className="divide-y divide-slate-200/70">
                  {aulasArray.map((aulaNum) => {
                    const isIntervalRow = aulaNum === posicao_intervalo;

                    return (
                      <React.Fragment key={`periodo_aula_${aulaNum}`}>
                        {/* Linha da Aula Atual */}
                        <div className="grid grid-cols-[135px_repeat(5,minmax(0,1fr))] transition-colors hover:bg-slate-50/30">
                          {/* Eixo Y: Marcação de Período dinâmico ("1ª Aula", "2ª Aula", ..., "Nª Aula") */}
                          <div className="p-4 flex flex-col items-center justify-center bg-slate-50/50 border-r border-slate-200/70">
                            <span className="text-sm font-bold text-slate-700">
                              {aulaNum}ª Aula
                            </span>
                            <code className="text-[10px] text-slate-400 mt-0.5">
                              Slot {aulaNum}
                            </code>
                          </div>

                          {/* Colunas dos Dias da Semana com Droppable Slots (slot_dia_X_aula_Y) */}
                          {DAYS.map((day, dayIdx) => {
                            const slotId = buildSlotId(day.dayNumber, aulaNum);
                            const lesson = lessonsMap[slotId];
                            const isFilteredOut =
                              !!lesson &&
                              selectedProfessor !== "Todos os Professores" &&
                              lesson.teacher !== selectedProfessor;

                            return (
                              <DroppableSlotCell
                                key={slotId}
                                slotId={slotId}
                                isEmpty={!lesson}
                              >
                                {lesson && (
                                  <DraggableLessonBlock
                                    lesson={lesson}
                                    slotId={slotId}
                                    isFilteredOut={isFilteredOut}
                                    isShaking={shakingLessonId === lesson.id}
                                    isApprovedGlow={
                                      approvedLessonId === lesson.id
                                    }
                                  />
                                )}
                              </DroppableSlotCell>
                            );
                          })}
                        </div>

                        {/* INTERVALO DINÂMICO CONDICIONAL: Injetado logo após a aula de índice posicao_intervalo */}
                        {isIntervalRow && (
                          <div
                            key={`intervalo_apos_aula_${aulaNum}`}
                            className="grid grid-cols-[135px_repeat(5,minmax(0,1fr))] bg-slate-100 text-slate-600 border-y border-slate-200/80 transition-colors"
                          >
                            <div className="py-2.5 px-4 flex items-center justify-center border-r border-slate-200/80 bg-slate-100">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Intervalo
                              </span>
                            </div>
                            <div className="col-span-5 py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 bg-slate-100">
                              <Coffee className="w-4 h-4 text-amber-600" />
                              <span>
                                Intervalo / Recreio Escolar (após a{" "}
                                {posicao_intervalo}ª Aula)
                              </span>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* DragOverlay */}
          <DragOverlay>
            {activeDraggedLesson ? (
              <div className="w-[185px]">
                <LessonCardVisual
                  lesson={activeDraggedLesson}
                  isOverlay={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Modal de Diagnóstico e Sugestões da IA */}
      <InfeasibilityReportModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        onReoptimizeWithFixes={handleReoptimizeWithFixes}
        title={
          activeJob?.unfeasibleReport?.title ||
          "A Grade precisa de ajustes para ser finalizada"
        }
        reason={
          activeJob?.unfeasibleReport?.reason ||
          "Encontramos gargalos de disponibilidade e regras rígidas que impedem o fechamento automático. Escolha uma sugestão da IA ao lado de cada ponto para destravar a geração."
        }
        turma={selectedTurma}
        jobId={activeJob?.job_id}
        conflicts={currentConflicts}
      />
    </div>
  );
}
