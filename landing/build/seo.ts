import { faq } from '../src/content';
import { pages, site } from '../src/pages.config';

/** JSON-LD blocks for a page, serialised for a <script type="application/ld+json">. */
export function jsonLd(pageName: string): string[] {
    const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: site.name,
        url: site.url,
        email: site.email,
        logo: `${site.url}/icon-512.png`,
        founder: { '@type': 'Person', name: 'Ayodapo Ige' },
    };

    if (pageName !== 'index') return [JSON.stringify(organization)];

    const app = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: site.name,
        url: site.appUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description: pages.index!.description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    };

    const faqPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
    };

    return [organization, app, faqPage].map((block) => JSON.stringify(block).replace(/</g, '\\u003c'));
}

export function sitemap(): string {
    const today = new Date().toISOString().slice(0, 10);
    const urls = Object.values(pages)
        .map((page) => `  <url><loc>${site.url}${page.path}</loc><lastmod>${today}</lastmod></url>`)
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
