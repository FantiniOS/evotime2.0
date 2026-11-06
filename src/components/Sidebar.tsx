"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Sparkles,
  CalendarClock,
  ChevronRight,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "inicio", label: "Início", href: "/", icon: LayoutDashboard },
  { id: "professores", label: "Professores", href: "/grade?view=professores", icon: Users },
  { id: "turmas", label: "Turmas", href: "/grade?view=turmas", icon: GraduationCap },
  { id: "disciplinas", label: "Disciplinas", href: "/grade?view=disciplinas", icon: BookOpen },
  { id: "grade-ia", label: "Grade IA", href: "/grade", icon: Sparkles, badge: "IA" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between select-none">
      {/* Top Brand Section */}
      <div>
        <Link
          href="/"
          className="h-20 px-6 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-lg leading-none">
                EvoTime
              </span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 leading-none">
                2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Gestão Escolar Inteligente
            </p>
          </div>
        </Link>

        {/* Navigation Menu */}
        <div className="px-3 py-6">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Principal
          </p>
          <nav className="space-y-1" aria-label="Menu Principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === "inicio"
                  ? pathname === "/"
                  : item.id === "grade-ia"
                  ? pathname === "/grade"
                  : false;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-50/90 text-indigo-600 shadow-sm shadow-indigo-500/5"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                        isActive
                          ? "text-indigo-600"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-all duration-200 ${
                        isActive
                          ? "opacity-100 text-indigo-500 translate-x-0"
                          : "opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 text-slate-400"
                      }`}
                    />
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Executive Profile Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold tracking-wider">
            CA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              Coordenação Acadêmica
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              Ano Letivo • Semestre Ativo
            </p>
          </div>
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50"
            title="Sistema Online"
          />
        </div>
      </div>
    </aside>
  );
}
