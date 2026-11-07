"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SCHOOLS_LIST,
  SCHOOLS_STORAGE_KEY,
  ACTIVE_SCHOOL_STORAGE_KEY,
  FALLBACK_EMPTY_SCHOOL,
  SchoolTenant,
} from "@/lib/schoolData";
import { logoutAction, switchTenantSessionAction } from "@/actions/authActions";
import { listarEscolas, selecionarEscolaAtiva } from "@/actions/escolaActions";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  Sparkles,
  CalendarClock,
  User,
  ChevronDown,
  Building2,
  Check,
  ShieldCheck,
  Settings,
  Printer,
  LogOut,
  Plus,
} from "lucide-react";

export interface TopNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: TopNavItem[] = [
  { id: "inicio", label: "Início", href: "/", icon: LayoutDashboard },
  {
    id: "disciplinas",
    label: "Disciplinas",
    href: "/disciplinas",
    icon: BookOpen,
  },
  {
    id: "turmas",
    label: "Turmas",
    href: "/turmas",
    icon: GraduationCap,
  },
  {
    id: "professores",
    label: "Professores",
    href: "/professores",
    icon: Users,
  },
  {
    id: "grade-ia",
    label: "Grade IA",
    href: "/grade",
    icon: Sparkles,
    badge: "IA",
  },
];

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolTenant[]>(SCHOOLS_LIST);
  const [activeSchool, setActiveSchool] = useState<SchoolTenant>(
    SCHOOLS_LIST[0] || FALLBACK_EMPTY_SCHOOL
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadSchoolsAndActive = async () => {
    try {
      // 1. Busca escolas cadastradas diretamente no Supabase
      const response = await listarEscolas();
      let currentList: SchoolTenant[] = [];

      if (response.success && response.data && response.data.length > 0) {
        currentList = (response.data || []).map((row: any) => ({
          id: row.id,
          name: row.nome,
          subtitle:
            row.subtitulo || row.modelo_ensino || "Instituição de Ensino",
          cnpjOrInep: row.cnpj_ou_inep || "",
          educationModel: (row.modelo_ensino ||
            "Ensino Fundamental e Médio") as any,
          city: row.cidade || "Brasil",
          planBadge: row.plano_badge || "Plano Ativo",
          classesCount: 0,
          studentsCount: 0,
          logoDataUrl: row.logo_data_url || undefined,
        }));
        setSchools(currentList);
        try {
          localStorage.setItem(
            SCHOOLS_STORAGE_KEY,
            JSON.stringify(currentList)
          );
        } catch {}
      } else {
        // Fallback para cache local ou lista padrão
        const savedList = localStorage.getItem(SCHOOLS_STORAGE_KEY);
        if (savedList) {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentList = parsed;
            setSchools(parsed);
          }
        }
        if (currentList.length === 0) {
          currentList = SCHOOLS_LIST;
          setSchools(currentList);
        }
      }

      // 2. Determina a escola ativa a partir do Cookie ou localStorage
      let activeId = "";
      const matchCookie = document.cookie.match(
        /(?:^|;\s*)escola_ativa_id=([^;]+)/
      );
      if (matchCookie) {
        activeId = decodeURIComponent(matchCookie[1]);
      } else {
        activeId = localStorage.getItem(ACTIVE_SCHOOL_STORAGE_KEY) || "";
      }

      if (currentList.length > 0) {
        const found = currentList.find((s) => s.id === activeId);
        if (found) {
          setActiveSchool(found);
          document.cookie = `escola_ativa_id=${encodeURIComponent(
            found.id
          )}; path=/; max-age=31536000; SameSite=Lax`;
          return;
        }
        // Se a escola salva não existir, seleciona a primeira da lista
        setActiveSchool(currentList[0]);
        document.cookie = `escola_ativa_id=${encodeURIComponent(
          currentList[0].id
        )}; path=/; max-age=31536000; SameSite=Lax`;
        try {
          localStorage.setItem(ACTIVE_SCHOOL_STORAGE_KEY, currentList[0].id);
        } catch {}
      } else {
        setActiveSchool(FALLBACK_EMPTY_SCHOOL);
      }
    } catch {
      setActiveSchool(FALLBACK_EMPTY_SCHOOL);
    }
  };

  useEffect(() => {
    loadSchoolsAndActive();

    const handleSchoolsUpdated = () => loadSchoolsAndActive();
    window.addEventListener("evotime:schools-updated", handleSchoolsUpdated);
    window.addEventListener("evotime:school-change", handleSchoolsUpdated);
    return () => {
      window.removeEventListener(
        "evotime:schools-updated",
        handleSchoolsUpdated
      );
      window.removeEventListener("evotime:school-change", handleSchoolsUpdated);
    };
  }, []);

  // Fechar dropdown ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelectSchool = async (school: SchoolTenant) => {
    setActiveSchool(school);
    setIsDropdownOpen(false);
    try {
      // 1. Grava no Cookie do navegador de forma síncrona
      document.cookie = `escola_ativa_id=${encodeURIComponent(
        school.id
      )}; path=/; max-age=31536000; SameSite=Lax`;

      // 2. Grava no localStorage para sincronia de componentes legados
      localStorage.setItem(ACTIVE_SCHOOL_STORAGE_KEY, school.id);

      // 3. Atualiza cookie no servidor via Server Actions
      await selecionarEscolaAtiva(school.id);
      await switchTenantSessionAction(school.id);

      // 4. Dispara evento de mudança de escola
      window.dispatchEvent(
        new CustomEvent("evotime:school-change", { detail: school })
      );

      // 5. Atualiza os dados dos Server Components preservando o layout SPA
      router.refresh();
    } catch {
      router.refresh();
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAction();
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm border-b border-slate-200/80 print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Esquerda: Logo EvoTime 2.0 + Seletor de Escola Ativa */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:bg-indigo-700 transition-colors">
              <CalendarClock className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">
              EvoTime 2.0
            </span>
          </Link>

          {/* Divisor Vertical */}
          <span
            className="h-6 w-px bg-slate-200 hidden sm:inline-block"
            aria-hidden="true"
          />

          {/* Dropdown Seletor de Escola (Multi-Tenant) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
              className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-left transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                isDropdownOpen
                  ? "bg-indigo-50/70 border-indigo-300 shadow-2xs"
                  : "bg-slate-50/90 hover:bg-slate-100/80 border-slate-200/90 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden transition-colors ${
                  isDropdownOpen
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-indigo-600 border border-slate-200/80 group-hover:border-indigo-200"
                }`}
              >
                {activeSchool.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeSchool.logoDataUrl}
                    alt={activeSchool.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
              </div>

              <div className="hidden sm:block min-w-0 max-w-[180px] lg:max-w-[210px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 leading-none">
                    Escola Ativa
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {activeSchool.name}
                </p>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                  isDropdownOpen ? "rotate-180 text-indigo-600" : ""
                }`}
              />
            </button>

            {/* Menu Suspenso de Troca de Escola */}
            {isDropdownOpen && (
              <div
                role="listbox"
                aria-label="Selecionar Escola Ativa"
                className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
              >
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Selecionar Instituição Ativa
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                    {(schools || []).length} {(schools || []).length === 1 ? "escola" : "escolas"}
                  </span>
                </div>

                <div className="p-1.5 space-y-1 max-h-64 overflow-y-auto">
                  {(!schools || schools.length === 0) ? (
                    <div className="py-5 px-3 text-center">
                      <p className="text-xs text-slate-500 font-medium">
                        Nenhuma escola cadastrada ainda.
                      </p>
                      <Link
                        href="/escolas"
                        onClick={() => setIsDropdownOpen(false)}
                        className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cadastrar primeira escola</span>
                      </Link>
                    </div>
                  ) : (
                    (schools || []).map((school) => {
                      const isSelected = school.id === activeSchool.id;
                      return (
                        <button
                          key={school.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectSchool(school)}
                          className={`w-full px-3 py-2.5 rounded-xl text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50/90 text-indigo-950 border border-indigo-200/80"
                              : "hover:bg-slate-50 text-slate-700 border border-transparent"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 overflow-hidden ${
                                isSelected
                                  ? "bg-indigo-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {school.logoDataUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={school.logoDataUrl}
                                  alt={school.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold truncate ${
                                  isSelected
                                    ? "text-indigo-950"
                                    : "text-slate-800"
                                }`}
                              >
                                {school.name}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {school.educationModel || school.subtitle}
                              </p>
                              {school.cnpjOrInep && (
                                <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-400">
                                  CNPJ/INEP: {school.cnpjOrInep}
                                </span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Ações Rápidas no Rodapé do Dropdown */}
                <div className="px-2 pt-1.5 pb-1 border-t border-slate-100 space-y-1">
                  <Link
                    href="/escolas"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Nova Instituição</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      /escolas
                    </span>
                  </Link>

                  <Link
                    href="/usuarios"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Gestão da Equipe & Acessos</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      /usuarios
                    </span>
                  </Link>

                  <Link
                    href="/configuracoes"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      <span>Configurações do Turno</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      /configuracoes
                    </span>
                  </Link>
                </div>

                <div className="mt-1 px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    Escola Ativa:{" "}
                    <strong className="text-slate-700">
                      {activeSchool.name}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Centro: Links de Navegação Horizontais */}
        <nav
          aria-label={`Navegação de ${activeSchool.name}`}
          className="hidden lg:flex items-center gap-1"
        >
          {(navItems || []).map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === "inicio"
                ? pathname === "/"
                : item.id === "professores"
                ? pathname.startsWith("/professores")
                : item.id === "disciplinas"
                ? pathname.startsWith("/disciplinas")
                : item.id === "turmas"
                ? pathname.startsWith("/turmas")
                : item.id === "grade-ia"
                ? pathname.startsWith("/grade")
                : false;

            return (
              <Link
                key={item.id}
                href={item.href}
                title={`${item.label} • ${activeSchool.name}`}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-50/90 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Direita: Exportação PDF + Configurações + Botão Sair */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/exportar"
            title="Estúdio de Exportação e Relatórios PDF A4 (/exportar)"
            className={`p-2 rounded-xl border transition-all duration-200 ${
              pathname.startsWith("/exportar")
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Printer className="w-4 h-4" />
          </Link>

          <Link
            href="/usuarios"
            title="Gestão de Equipe & Usuários (/usuarios)"
            className={`p-2 rounded-xl border transition-all duration-200 ${
              pathname.startsWith("/usuarios")
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
          </Link>

          <Link
            href="/configuracoes"
            title="Configurações da Instituição (/configuracoes)"
            className={`p-2 rounded-xl border transition-all duration-200 ${
              pathname.startsWith("/configuracoes")
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Sair da Plataforma"
            className="p-2 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
