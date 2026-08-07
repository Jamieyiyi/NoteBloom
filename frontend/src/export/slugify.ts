export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'section'
}

export function makeUniqueSlug(base: string, used: Set<string>): string {
  let slug = base
  let counter = 2
  while (used.has(slug)) {
    slug = `${base}-${counter}`
    counter += 1
  }
  used.add(slug)
  return slug
}
