import { z } from "zod";

/**
 * Schema Zod de criação de usuários.
 * Sem diretiva "use server" — importado pelas Server Actions apenas para uso.
 */
export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "O nome deve ter no mínimo 2 caracteres."),
  username: z
    .string()
    .trim()
    .min(3, "O nome de usuário deve ter no mínimo 3 caracteres.")
    .max(50, "O nome de usuário deve ter no máximo 50 caracteres.")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "O usuário deve conter apenas letras, números, pontos, hífens ou underscores (sem espaços)."
    ),
  senha: z
    .string()
    .min(6, "A senha provisória deve ter no mínimo 6 caracteres.")
    .max(128, "Senha muito longa."),
  role: z.enum(["admin", "coordenador", "diretor", "professor"] as const),
  escolaId: z.string().optional().nullable(),
});
