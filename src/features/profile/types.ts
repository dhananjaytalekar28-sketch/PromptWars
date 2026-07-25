import type { z } from "zod";
import { profileSchema, roleSchema } from "./schemas";

export type Role = z.infer<typeof roleSchema>;
export type Profile = z.infer<typeof profileSchema>;
