import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "O campo de usuário é obrigatório.")
    .max(80, "Nome de usuário muito longo.")
    .regex(
      /^[a-zA-Z0-9._@-]+$/,
      "O usuário pode conter apenas letras, números, pontos, traços ou underscores."
    ),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres.")
    .max(128, "A senha excede o tamanho máximo permitido."),
});

export type LoginFormInput = z.infer<typeof loginSchema>;
