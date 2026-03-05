/** Convert a title to a URL-safe slug. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Append a numeric suffix to make a slug unique, e.g. "my-event-2". */
export function uniqueSlug(base: string, suffix: number): string {
  return suffix === 0 ? base : `${base}-${suffix}`;
}
