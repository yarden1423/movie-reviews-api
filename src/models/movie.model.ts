import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/toJSON';

export const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
] as const;
export type Genre = (typeof GENRES)[number];

export const FIRST_FILM_YEAR = 1888;

const movieSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    releaseYear: { type: Number, required: true },
    genres: { type: [String], enum: GENRES, default: [] },
    director: { type: String, trim: true },
    actors: { type: [String], default: [] },
    description: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized rating stats, maintained by the review service.
    averageRating: { type: Number, default: 0, min: 0 },
    reviewsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

/** Case-insensitive collation shared by the unique index and duplicate lookups. */
export const TITLE_COLLATION = { locale: 'en', strength: 2 } as const;

movieSchema.index(
  { title: 1, releaseYear: 1 },
  { unique: true, collation: TITLE_COLLATION, name: 'unique_title_year' },
);
movieSchema.index({ averageRating: -1 });
movieSchema.index({ genres: 1 });

export type MovieAttrs = InferSchemaType<typeof movieSchema>;
export type MovieDocument = HydratedDocument<MovieAttrs>;
export const Movie = model('Movie', movieSchema);
