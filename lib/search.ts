import { z } from "zod";

export const searchSchema = z.object({
  rua: z.string().trim().min(1, "Informe a rua").max(120).optional(),
  numero: z
    .union([z.string().trim(), z.number()])
    .transform((v) => (v === "" ? undefined : String(v)))
    .pipe(z.string().regex(/^\d+[A-Za-z]?$/, "Número inválido").optional())
    .optional(),
  bairro: z.string().trim().optional(),
  ano: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^\d{4}$/)).max(7))
    .optional(),
  minM2: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .pipe(z.number().finite().nonnegative().optional())
    .optional(),
  maxM2: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .pipe(z.number().finite().nonnegative().optional())
    .optional(),
  porUnidade: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === "true" || v === "1" || v === "on")
    .optional(),
});

export type SearchParams = z.infer<typeof searchSchema>;