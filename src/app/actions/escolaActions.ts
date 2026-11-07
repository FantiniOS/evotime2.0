"use server";

/**
 * Re-export explícito APENAS das Server Actions (funções assíncronas).
 * NÃO use `export *` em arquivos "use server": isso re-exportaria também
 * schemas/objetos e quebraria o runtime com
 * 'A "use server" file can only export async functions, found object'.
 */
export {
  criarEscola,
  listarEscolas,
  selecionarEscolaAtiva,
  obterEscolaAtivaId,
  salvarConfiguracoesEscola,
} from "@/actions/escolaActions";
