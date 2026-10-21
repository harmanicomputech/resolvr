import type { Jurisdiction } from '@/lib/model/catalog';

/** Display names for jurisdiction packs. Only the US pack has full legal content so far (P3.1 adds the rest). */
export const jurisdictionInfo: Record<Jurisdiction, { name: string; short: string; ready: boolean }> = {
    us: { name: 'United States', short: 'US', ready: true },
    uk: { name: 'United Kingdom', short: 'UK', ready: false },
    ng: { name: 'Nigeria', short: 'NG', ready: false },
    ca: { name: 'Canada', short: 'CA', ready: false },
};
