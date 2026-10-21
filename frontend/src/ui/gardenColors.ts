/**
 * Flower colours for categories, handed out in sidebar order so neighbouring categories never share a colour.
 * The petals of a category's notes use the same colour; notes without a category stay pink.
 */
const CATEGORY_COLORS = ['#f2b33d', '#6aa7e8', '#a68be0', '#ef8a4c', '#4fb8a8', '#e86a6a'] as const

export const UNCATEGORIZED_COLOR = 'var(--petal)'

/** categoryIds in sidebar (tree) order → colour */
export function categoryColors(categoryIds: string[]): Map<string, string> {
  return new Map(categoryIds.map((id, index) => [id, CATEGORY_COLORS[index % CATEGORY_COLORS.length]]))
}
