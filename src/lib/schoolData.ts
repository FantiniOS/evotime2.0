export interface PastelColorOption {
  id: string;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  ringClass: string;
  dotClass: string;
}

export const PASTEL_COLORS: PastelColorOption[] = [
  {
    id: "blue",
    label: "Azul Pastel",
    bgClass: "bg-blue-100",
    borderClass: "border-blue-200",
    textClass: "text-blue-900",
    ringClass: "ring-blue-500",
    dotClass: "bg-blue-500",
  },
  {
    id: "emerald",
    label: "Esmeralda Pastel",
    bgClass: "bg-emerald-100",
    borderClass: "border-emerald-200",
    textClass: "text-emerald-900",
    ringClass: "ring-emerald-500",
    dotClass: "bg-emerald-500",
  },
  {
    id: "amber",
    label: "Âmbar Pastel",
    bgClass: "bg-amber-100",
    borderClass: "border-amber-200",
    textClass: "text-amber-900",
    ringClass: "ring-amber-500",
    dotClass: "bg-amber-500",
  },
  {
    id: "purple",
    label: "Roxo Pastel",
    bgClass: "bg-purple-100",
    borderClass: "border-purple-200",
    textClass: "text-purple-900",
    ringClass: "ring-purple-500",
    dotClass: "bg-purple-500",
  },
  {
    id: "rose",
    label: "Rosa Pastel",
    bgClass: "bg-rose-100",
    borderClass: "border-rose-200",
    textClass: "text-rose-900",
    ringClass: "ring-rose-500",
    dotClass: "bg-rose-500",
  },
  {
    id: "teal",
    label: "Teal Pastel",
    bgClass: "bg-teal-100",
    borderClass: "border-teal-200",
    textClass: "text-teal-900",
    ringClass: "ring-teal-500",
    dotClass: "bg-teal-500",
  },
  {
    id: "indigo",
    label: "Indigo Pastel",
    bgClass: "bg-indigo-100",
    borderClass: "border-indigo-200",
    textClass: "text-indigo-900",
    ringClass: "ring-indigo-500",
    dotClass: "bg-indigo-500",
  },
  {
    id: "orange",
    label: "Laranja Pastel",
    bgClass: "bg-orange-100",
    borderClass: "border-orange-200",
    textClass: "text-orange-900",
    ringClass: "ring-orange-500",
    dotClass: "bg-orange-500",
  },
];

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  colorId: string;
}

export interface CurriculumItem {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  colorId: string;
  weeklyClasses: number;
}

export interface SchoolClassItem {
  id: string;
  name: string;
  shift: "Matutino" | "Vespertino" | "Noturno" | "Integral";
  curriculum: CurriculumItem[];
}

export type EducationModelType =
  | "Ensino Fundamental"
  | "Ensino Médio"
  | "Ensino Técnico"
  | "Ensino Fundamental e Médio";

export interface SchoolTenant {
  id: string;
  name: string;
  subtitle: string;
  cnpjOrInep: string;
  educationModel: EducationModelType;
  studentsCount: number;
  classesCount: number;
  city: string;
  planBadge: string;
  logoDataUrl?: string;
}

export const FALLBACK_EMPTY_SCHOOL: SchoolTenant = {
  id: "escola-padrao",
  name: "Minha Escola",
  subtitle: "Configure sua instituição",
  cnpjOrInep: "Cadastre nas configurações",
  educationModel: "Ensino Fundamental e Médio",
  studentsCount: 0,
  classesCount: 0,
  city: "Cidade • UF",
  planBadge: "Plano Inicial",
};

export const SCHOOLS_LIST: SchoolTenant[] = [];

export const SCHOOLS_STORAGE_KEY = "evotime_schools_list_v1";
export const ACTIVE_SCHOOL_STORAGE_KEY = "evotime_active_school_v1";
export const SUBJECTS_STORAGE_KEY = "evotime_disciplinas_v1";
export const CLASSES_STORAGE_KEY = "evotime_turmas_v1";
export const TEACHERS_STORAGE_KEY = "evotime_professores_v3";

export const DEFAULT_SUBJECTS: SubjectItem[] = [];

export const DEFAULT_CLASSES: SchoolClassItem[] = [];

export function getColorOption(colorId: string): PastelColorOption {
  return (
    PASTEL_COLORS.find((c) => c.id === colorId) || PASTEL_COLORS[0]
  );
}
