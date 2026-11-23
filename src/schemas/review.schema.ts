import { z } from 'zod';
import { RATING_MAX, RATING_MIN } from './movie.schema';

const reviewFields = {
  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int('Rating must be a whole number')
    .min(RATING_MIN, `Rating must be between ${RATING_MIN} and ${RATING_MAX}`)
    .max(RATING_MAX, `Rating must be between ${RATING_MIN} and ${RATING_MAX}`),
  text: z.string().trim().min(1, 'Review text is required').max(2000),
};

export const createReviewSchema = z.object(reviewFields);

export const updateReviewSchema = z
  .object(reviewFields)
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
