import { z } from "zod";

export const roleSchema = z.enum(["person", "caregiver"]);

export const profileSchema = z
  .object({
    role: roleSchema,
    nickname: z.string().trim().min(1).max(80).optional(),
  })
  .strict();
