import React from "react";
import { createClient } from "@/utils/supabase/server";
import { emailToUsername } from "@/lib/auth/emailMapping";
import UsuariosClient, {
  SerializableUsuario,
  SerializableEscola,
} from "./UsuariosClient";

export const dynamic = "force-dynamic";

/**
 * Server Component: UsuariosPage
 * Separação estrita de responsabilidades (Server-to-Client):
 * - Executa a busca de dados no Supabase diretamente no servidor.
 * - Garante serialização estrita de datas para string ISO (evita erro #441).
 * - Renderiza o Client Component UsuariosClient para interatividade (modais, filtros).
 */
export default async function UsuariosPage() {
  const supabase = await createClient();

  // Escolas e usuários são independentes: executa as duas consultas EM PARALELO
  // (antes eram sequenciais — dois round-trips ao banco somados).
  const [escolas, usuarios] = await Promise.all([
    buscarEscolas(supabase),
    buscarUsuarios(supabase),
  ]);

  return (
    <UsuariosClient
      initialUsuarios={usuarios}
      initialEscolas={escolas}
    />
  );
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

async function buscarEscolas(
  supabase: ServerSupabase
): Promise<SerializableEscola[]> {
  let escolas: SerializableEscola[] = [];

  // 1. Busca escolas cadastradas para o seletor de unidade
  try {
    const { data: escolasData, error: escolasError } = await supabase
      .from("escolas")
      .select("id, nome")
      .order("created_at", { ascending: false });

    if (escolasError) {
      console.error(
        "Erro no Supabase ao listar escolas no Server Component:",
        escolasError
      );
    } else if (escolasData) {
      escolas = (escolasData || []).map((e: any) => ({
        id: String(e.id),
        nome: String(e.nome || "Escola sem nome"),
      }));
    }
  } catch (err) {
    console.error("Exceção ao listar escolas no Server Component:", err);
  }

  return escolas;
}

async function buscarUsuarios(
  supabase: ServerSupabase
): Promise<SerializableUsuario[]> {
  let usuarios: SerializableUsuario[] = [];

  // 2. Busca lista de usuários com join de escolas (1 única query, sem N+1)
  try {
    let { data: usuariosData, error: usuariosError } = await supabase
      .from("usuarios")
      .select(`
        id,
        nome,
        username,
        email,
        role,
        escola_id,
        created_at,
        escolas:escola_id (
          nome
        )
      `)
      .order("created_at", { ascending: false });

    // Fallback se a coluna username ainda não tiver sido criada
    if (usuariosError && usuariosError.message.includes("username")) {
      const fallbackQuery = await supabase
        .from("usuarios")
        .select(`
          id,
          nome,
          email,
          role,
          escola_id,
          created_at,
          escolas:escola_id (
            nome
          )
        `)
        .order("created_at", { ascending: false });
      usuariosData = fallbackQuery.data as any;
      usuariosError = fallbackQuery.error;
    }

    if (usuariosError) {
      console.error(
        "Erro no Supabase ao listar usuários no Server Component:",
        usuariosError
      );
    } else if (usuariosData) {
      usuarios = (usuariosData || []).map((row: any) => {
        // Tratamento rigoroso de data para string ISO pura (previne React Error #441)
        let createdAtIso = new Date().toISOString();
        if (row.created_at) {
          if (typeof row.created_at === "string") {
            createdAtIso = row.created_at;
          } else if (row.created_at instanceof Date) {
            createdAtIso = row.created_at.toISOString();
          } else {
            try {
              createdAtIso = new Date(row.created_at).toISOString();
            } catch {
              createdAtIso = new Date().toISOString();
            }
          }
        }

        return {
          id: String(row.id),
          nome: String(row.nome || "Membro da Equipe"),
          username: String(
            row.username || emailToUsername(row.email || "")
          ),
          email: String(row.email || ""),
          role: (row.role || "coordenador") as
            | "admin"
            | "coordenador"
            | "diretor"
            | "professor",
          escola_id: row.escola_id ? String(row.escola_id) : null,
          escola_nome: row.escolas?.nome
            ? String(row.escolas.nome)
            : row.escola_id
            ? "Escola Vinculada"
            : "Acesso Global",
          created_at: createdAtIso,
        };
      });
    }
  } catch (err) {
    console.error("Exceção ao listar usuários no Server Component:", err);
  }

  return usuarios;
}
