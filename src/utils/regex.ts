/** Escapes user input so it is matched literally inside a RegExp. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsInsensitive(input: string): RegExp {
  return new RegExp(escapeRegex(input), 'i');
}
