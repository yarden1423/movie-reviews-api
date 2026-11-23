import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { RATING_MAX, RATING_MIN } from '../schemas/movie.schema';
import { toJSONOptions } from '../utils/toJSON';

const reviewSchema = new Schema(
  {
    movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: RATING_MIN, max: RATING_MAX },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

// One review per user per movie — also protects against concurrent double-submits.
reviewSchema.index({ movie: 1, user: 1 }, { unique: true, name: 'unique_movie_user' });
reviewSchema.index({ movie: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

export type ReviewAttrs = InferSchemaType<typeof reviewSchema>;
export type ReviewDocument = HydratedDocument<ReviewAttrs>;
export const Review = model('Review', reviewSchema);
