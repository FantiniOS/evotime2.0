"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  criarUsuario,
  excluirUsuario,
} from "@/actions/usuarioActions";
import {
  emailToUsername,
  sanitizeUsername,
} from "@/lib/auth/emailMapping";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Lock,
  User,
  Building2,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  GraduationCap,
  Sparkles,
  AtSign,
  RefreshCw,
} from "lucide-react";

export interface SerializableUsuario {
  id: string;
  nome: string;
  username: string;
  email: string;
  role: "admin" | "coordenador" | "diretor" | "professor";
  escola_id: string | null;
  escola_nome?: string | null;
  created_at: string;
}

export interface SerializableEscola {
  id: string;
  nome: string;
}

export interface UsuariosClientProps {
  initialUsuarios: SerializableUsuario[];
  initialEscolas: SerializableEscola[];
}

export default function UsuariosClient({
  initialUsuarios = [],
  initialEscolas = [],
}: UsuariosClientProps) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<SerializableUsuario[]>(initialUsuarios);
  const [escolas, setEscolas] = useState<SerializableEscola[]>(initialEscolas);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");
  const [showPassword, setShowPassword] = useState(false);

  // Estados do formulário de criação
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"admin" | "coordenador" | "diretor">("coordenador");
  const [escolaId, setEscolaId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleOpenModal = () => {
    setNome("");
    setUsername("");
    setSenha("");
    setRole("coordenador");
    setEscolaId(escolas?.[0]?.id || "");
    setFormError(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isPending) {
      setIsModalOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUser = sanitizeUsername(username);

    if (!nome.trim() || !cleanUser || !senha.trim()) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (cleanUser.length < 3) {
      setFormError("O nome de usuário deve ter no mínimo 3 caracteres.");
      return;
    }

    if (senha.length < 6) {
      setFormError("A senha provisória deve ter no mínimo 6 caracteres.");
      return;
    }

    startTransition(async () => {
      const cleanPayload = {
        nome: String(nome).trim(),
        username: String(cleanUser),
        senha: String(senha).trim(),
        role,
        escolaId: escolaId && escolaId.length > 5 ? String(escolaId) : null,
      };

      const result = await criarUsuario(cleanPayload);

      if (result.success) {
        toast.success(result.message || "Usuário convidado com sucesso", {
          description: `Login criado para @${cleanUser}. Senha provisória configurada.`,
        });

        // Adiciona otimisticamente na lista local
        const escolaEscolhida = escolas.find((e) => e.id === escolaId);
        const novoUsuario: SerializableUsuario = {
          id: result.data?.id || `user-temp-${Date.now()}`,
          nome: nome.trim(),
          username: cleanUser,
          email: `${cleanUser}@evotime.local`,
          role,
          escola_id: escolaId || null,
          escola_nome: escolaEscolhida?.nome || "Acesso Global",
          created_at: new Date().toISOString(),
        };

        setUsuarios((prev) => [novoUsuario, ...(prev || [])]);
        setIsModalOpen(false);
        router.refresh();
      } else {
        setFormError(result.error || "Falha ao criar usuário.");
        toast.error("Erro ao criar usuário", {
          description: result.error,
        });
      }
    });
  };

  const handleExcluir = async (usuario: SerializableUsuario) => {
    const userDisplay = usuario.username || emailToUsername(usuario.email);
    if (
      !confirm(
        `Tem certeza que deseja remover o acesso de "${usuario.nome}" (@${userDisplay})?`
      )
    ) {
      return;
    }

    const toastId = toast.loading("Removendo usuário...");
    const res = await excluirUsuario(usuario.id);

    if (res.success) {
      toast.success("Usuário removido com sucesso.", { id: toastId });
      setUsuarios((prev) => (prev || []).filter((u) => u.id !== usuario.id));
      router.refresh();
    } else {
      toast.error(res.error || "Não foi possível excluir o usuário.", {
        id: toastId,
      });
    }
  };

  const usuariosFiltrados = (usuarios || []).filter((u) => {
    const q = (searchQuery || "").toLowerCase();
    const matchSearch =
      (u?.nome || "").toLowerCase().includes(q) ||
      (u?.username && u.username.toLowerCase().includes(q)) ||
      (u?.email || "").toLowerCase().includes(q) ||
      (u?.escola_nome && u.escola_nome.toLowerCase().includes(q));

    const matchRole =
      roleFilter === "todos"
        ? true
        : (u?.role || "").toLowerCase() === roleFilter.toLowerCase();

    return matchSearch && matchRole;
  });

  const totalAdmins = (usuarios || []).filter((u) => u?.role === "admin").length;
  const totalCoordenadores = (usuarios || []).filter(
    (u) => u?.role === "coordenador"
  ).length;

  const getRoleBadge = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldAlert className="w-3 h-3 text-purple-600" />
            <span>Administrador</span>
          </span>
        );
      case "diretor":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Diretor</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <GraduationCap className="w-3 h-3 text-indigo-600" />
            <span>Coordenador</span>
          </span>
        );
    }
  };

  const getInitials = (nameStr: string) => {
    const parts = (nameStr || "").trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (nameStr || "U").slice(0, 2).toUpperCase();
  };

  const previewUsername = sanitizeUsername(username) || "usuario";

  return (
    <div className="w-full flex-1 flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header Principal da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Gestão de Equipe & Permissões
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cadastre novos usuários com Nome de Usuário (login direto) e atribua níveis de acesso.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              title="Atualizar lista do servidor"
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer hover:shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total de Membros
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {(usuarios || []).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Administradores
              </span>
              <p className="text-2xl font-black text-purple-700 mt-1">
                {totalAdmins}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Coordenadores
              </span>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                {totalCoordenadores}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, usuário (@username) ou e-mail..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1 mr-1 hidden sm:inline" />
            {[
              { id: "todos", label: "Todos" },
              { id: "coordenador", label: "Coordenadores" },
              { id: "admin", label: "Admins" },
              { id: "diretor", label: "Diretores" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setRoleFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  roleFilter === f.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {usuariosFiltrados.length === 0 ? (
            <div className="py-20 px-4 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhum membro encontrado
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                {searchQuery || roleFilter !== "todos"
                  ? "Tente ajustar os filtros ou a busca digitada."
                  : "Convide coordenadores, administradores e diretores com nome de usuário direto."}
              </p>
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-500/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Convidar Primeiro Membro</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(usuariosFiltrados || []).map((u) => {
                const userTag = u.username || emailToUsername(u.email);
                return (
                  <div
                    key={u.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {getInitials(u.nome)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {u.nome}
                          </p>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono border border-slate-200">
                            @{userTag}
                          </span>
                          {getRoleBadge(u.role)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 truncate">
                          <span className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{u.escola_nome || "Acesso Global"}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Login Ativo</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleExcluir(u)}
                        title="Excluir Usuário"
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal / Diálogo: + Novo Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Convidar Novo Usuário
                  </h2>
                  <p className="text-xs text-slate-500">
                    Crie credenciais de acesso rápido com Nome de Usuário.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isPending}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Nome de Usuário (Username / Login) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nome de Usuário (Login) *
                  </label>
                  <span className="text-[11px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    @{previewUsername}
                  </span>
                </div>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/\s+/g, "")
                      )
                    }
                    placeholder="Ex: carlos, mariana.silva, coord.unidade"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 placeholder:font-sans"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>Usado diretamente no login (letras, números e pontos)</span>
                  <span className="font-mono text-slate-500">
                    {previewUsername}@evotime.local
                  </span>
                </div>
              </div>

              {/* Senha Provisória */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Senha Provisória *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  O usuário utilizará este username e senha na tela de login.
                </p>
              </div>

              {/* Nível de Acesso (Role) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nível de Acesso (Permissões) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "coordenador",
                      label: "Coordenador",
                      desc: "Grade e Turmas",
                    },
                    {
                      id: "admin",
                      label: "Admin",
                      desc: "Acesso Total",
                    },
                    {
                      id: "diretor",
                      label: "Diretor",
                      desc: "Relatórios",
                    },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        role === r.id
                          ? "bg-indigo-50/90 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <p className="text-xs font-bold">{r.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vínculo com Instituição */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Vínculo com Unidade Escolar (Opcional)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={escolaId}
                    onChange={(e) => setEscolaId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="">Acesso Global (Todas as Escolas)</option>
                    {(escolas || []).map((esc) => (
                      <option key={esc.id} value={esc.id}>
                        {esc.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 hover:shadow-md transition-all cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Convidando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Convidar Usuário</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
