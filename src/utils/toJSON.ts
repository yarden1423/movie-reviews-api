/** Shared toJSON transform: expose `id`, hide `_id`, `__v` and secrets. */
export const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
};
