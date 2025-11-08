export interface CategoryConfig {
  title: string;
  directory: string;
  slug: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  art: {
    title: 'Art',
    directory: 'art_placeholders',
    slug: 'art',
  },
  photo: {
    title: 'Photography',
    directory: 'photo_placeholders',
    slug: 'photo',
  },
  music: {
    title: 'Music',
    directory: 'music_placeholders',
    slug: 'music',
  },
  projects: {
    title: 'Projects',
    directory: 'pinterest_placeholders',
    slug: 'projects',
  },
  apparel: {
    title: 'Apparel',
    directory: 'apparel_placeholders',
    slug: 'apparel',
  },
};

export function getCategoryConfig(slug?: string): CategoryConfig | null {
  if (!slug) return null;
  const key = slug.toLowerCase();
  return CATEGORY_CONFIG[key] ?? null;
}
