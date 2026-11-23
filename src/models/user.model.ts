import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { toJSONOptions } from '../utils/toJSON';

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'user', required: true },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;
export const User = model('User', userSchema);
