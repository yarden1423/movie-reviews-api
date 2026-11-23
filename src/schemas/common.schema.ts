import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .refine((v) => isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v), 'Invalid id');

export const idParamsSchema = z.object({ id: objectIdSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationQuery,
): Paginated<T> {
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}
