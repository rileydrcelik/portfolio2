import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/settings/', '/api/'],
        },
        sitemap: 'https://rileydrcelik.com/sitemap.xml',
    }
}
