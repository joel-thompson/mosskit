import { z } from "zod";

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string()
});

export const exampleStatusSchema = z.object({
  message: z.string(),
  database: z.object({
    configured: z.boolean(),
    connected: z.boolean()
  })
});

export const protectedUserSchema = z.object({
  userId: z.string()
});

export const exampleStatusResponseSchema = z.object({
  success: z.literal(true),
  data: exampleStatusSchema
});

export const protectedUserResponseSchema = z.object({
  success: z.literal(true),
  data: protectedUserSchema
});
