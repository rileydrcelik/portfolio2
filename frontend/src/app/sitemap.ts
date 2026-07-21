import { MetadataRoute } from 'next'

const BASE_URL = 'https://rileydrcelik.com'

export default function sitemap(): MetadataRoute.Sitemap {
    // Static pages that should be indexed
    const staticPages = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 1,
        },
        {
            url: `${BASE_URL}/bio`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/art`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/photo`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/notes`,
            lastModified: new Date(),
            // Notes republish whenever they are edited in the w_notes app, so
            // this feed turns over faster than the other categories.
            changeFrequency: 'daily' as const,
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/projects`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/shop`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        },
    ]

    return staticPages
}
