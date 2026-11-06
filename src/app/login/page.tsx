"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema } from "@/lib/security/authSchema";
import { loginAction } from "@/actions/authActions";
import {
  SCHOOLS_LIST,
  ACTIVE_SCHOOL_STORAGE_KEY,
  FALLBACK_EMPTY_SCHOOL,
} from "@/lib/schoolData";
import {
  CalendarClock,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("coordenacao@evotime.edu.br");
  const [password, setPassword] = useState("EvoTime@2026");
  const [schoolId, setSchoolId] = useState(
    SCHOOLS_LIST[0]?.id || FALLBACK_EMPTY_SCHOOL.id
  );
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    // 1. Validação no Cliente com Zod antes do envio
    const parsed = loginSchema.safeParse({ email, password, schoolId });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    setIsLoading(true);

    try {
      // 2. Autenticação no Servidor via Server Action (grava cookie HttpOnly, Secure, SameSite=Lax com school_id)
      // O token de acesso NUNCA é salvo em localStorage ou manipulado via JS no cliente.
      const result = await loginAction({ email, password, schoolId });

      if (!result.success) {
        setFieldErrors({
          email: result.fieldErrors?.email?.[0],
          password: result.fieldErrors?.password?.[0],
        });
        setServerError(result.error || "Falha ao autenticar sessão.");
        setIsLoading(false);
        return;
      }

      // Sincroniza apenas o identificador visual da UI (nunca o token de acesso)
      if (result.sessionContext?.schoolId) {
        try {
          localStorage.setItem(
            ACTIVE_SCHOOL_STORAGE_KEY,
            result.sessionContext.schoolId
          );
        } catch {
          // Ignora erro
        }
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setServerError("Erro inesperado ao comunicar com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Identidade Visual EvoTime 2.0 */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/25">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-2 pt-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              EvoTime 2.0
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              Multi-Tenant
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Gestão de sessão segura com Cookies HttpOnly & Validação Zod
          </p>
        </div>

        {/* Card do Formulário de Login */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Entrar na Plataforma
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Informe suas credenciais para vincular o{" "}
                <code className="text-indigo-600 font-semibold">school_id</code>{" "}
                à sessão.
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {serverError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Campo: Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="coordenacao@escola.edu.br"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    fieldErrors.email
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            {/* Campo: Senha */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  placeholder="Mínimo de 8 caracteres"
                  className={`w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    fieldErrors.password
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Alternar visibilidade da senha"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Instituição Inicial (Registra school_id na sessão do servidor) */}
            <div>
              <label
                htmlFor="login-school"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Unidade Escolar (Contexto <code className="lowercase">school_id</code>)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  id="login-school"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {SCHOOLS_LIST.length === 0 ? (
                    <option value={FALLBACK_EMPTY_SCHOOL.id}>
                      {FALLBACK_EMPTY_SCHOOL.name} (Padrão)
                    </option>
                  ) : (
                    SCHOOLS_LIST.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (school_id: {s.id})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold shadow-sm shadow-indigo-500/20 hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {isLoading ? "Validando e Criando Sessão..." : "Entrar"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Rodapé Técnico de Segurança */}
          <div className="pt-4 border-t border-slate-100 space-y-1 text-[11px] text-slate-400">
            <p className="flex items-center justify-between">
              <span>Armazenamento do Token:</span>
              <strong className="text-emerald-700 font-semibold">
                Cookie HttpOnly • SameSite=Lax
              </strong>
            </p>
            <p className="flex items-center justify-between">
              <span>Proteção XSS (Sem localStorage):</span>
              <strong className="text-slate-700">Ativa (HMAC-SHA256)</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginFormContent />
    </Suspense>
  );
}
