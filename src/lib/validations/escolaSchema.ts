import { z } from "zod";

/**
 * Schemas Zod de Escolas.
 * IMPORTANTE: Este arquivo NÃO possui a diretiva "use server".
 * Arquivos "use server" só podem exportar funções assíncronas — por isso
 * schemas (objetos) vivem aqui e são apenas importados pelas Server Actions.
 */
export const criarEscolaSchema = z.object({
  nome: z.string().trim().min(2, "O nome da instituição é obrigatório."),
  cnpj: z.string().trim().optional().nullable(),
  modelo_ensino: z.string().trim().optional(),
  logo_data_url: z.string().optional().nullable(),
  bloquear_aulas_geminadas: z.boolean().default(true).optional(),
});

export const salvarConfiguracoesEscolaSchema = z.object({
  escolaId: z.string().min(1, "ID da escola é obrigatório."),
  nome: z.string().trim().optional(),
  cnpj: z.string().trim().optional().nullable(),
  bloquear_aulas_geminadas: z.boolean().default(true),
  configuracoes_ia: z.record(z.string(), z.any()).optional(),
  turnos: z.record(z.string(), z.any()).optional(),
});

export type CriarEscolaInput = z.infer<typeof criarEscolaSchema>;
export type SalvarConfiguracoesEscolaInput = z.infer<
  typeof salvarConfiguracoesEscolaSchema
>;
