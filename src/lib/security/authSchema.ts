import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "O campo de e-mail é obrigatório.")
    .email("Informe um endereço de e-mail válido (ex: nome@escola.edu.br)."),
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .max(128, "A senha excede o tamanho máximo permitido."),
  schoolId: z.string().optional(),
});

export type LoginFormInput = z.infer<typeof loginSchema>;
