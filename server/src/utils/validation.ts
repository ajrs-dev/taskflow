import { z, ZodError, type ZodSchema } from 'zod';
import { ApiError } from './ApiError';

/**
 * Validate `data` against a Zod schema. On failure, throw a 400 ApiError with
 * a readable message instead of leaking the raw Zod error.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const path = first.path.join('.');
      throw ApiError.badRequest(
        path ? `${path}: ${first.message}` : first.message,
      );
    }
    throw err;
  }
}

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const boardSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
});

export const listSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
});

export const createCardSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
});

export const updateCardSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((v) => v.title !== undefined || v.description !== undefined, {
    message: 'Provide a title or description to update',
  });

export const moveCardSchema = z.object({
  listId: z.number().int().positive(),
  position: z.number().int().min(0),
});
