import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "O campo de e-mail é obrigatório.")
    .email("Informe um endereço de e-mail válido (ex: nome@escola.edu.br)."),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres.")
    .max(128, "A senha excede o tamanho máximo permitido."),
});

export type LoginFormInput = z.infer<typeof loginSchema>;
