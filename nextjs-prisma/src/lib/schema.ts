import { z } from "zod";

export const SubmitSchema = z.object({
  quote: z.string(),
  author: z.string(),
});

export const ListSchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive(),
});
