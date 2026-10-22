import type { Jurisdiction } from '@/lib/model/catalog';

/** Display names for jurisdiction packs (content in lib/laws/*.json). */
export const jurisdictionInfo: Record<Jurisdiction, { name: string; short: string; ready: boolean }> = {
    us: { name: 'United States', short: 'US', ready: true },
    uk: { name: 'United Kingdom', short: 'UK', ready: true },
    ng: { name: 'Nigeria', short: 'NG', ready: true },
    ca: { name: 'Canada', short: 'CA', ready: true },
};
