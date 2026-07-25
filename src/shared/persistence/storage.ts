import type { z } from "zod";

export interface StorageAdapter {
  read<T>(key: string, schema: z.ZodType<T>): T | null;
  write<T>(key: string, value: T): void;
  remove(key: string): void;
}
