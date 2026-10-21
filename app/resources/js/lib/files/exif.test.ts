import { describe, expect, it } from 'vitest';

import { exifDateTaken } from './exif';

/** Build a minimal JPEG with an EXIF block holding DateTimeOriginal. */
function jpegWithDate(date: string, little = true): ArrayBuffer {
    const tiff: number[] = [];
    const u16 = (n: number) => (little ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
    const u32 = (n: number) =>
        little
            ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24]
            : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
    tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
    // IFD0 at 8: one entry pointing to the Exif IFD at 26.
    tiff.push(...u16(1), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(26), ...u32(0));
    // Exif IFD at 26: DateTimeOriginal, ASCII, 20 bytes at 44.
    tiff.push(...u16(1), ...u16(0x9003), ...u16(2), ...u32(20), ...u32(44), ...u32(0));
    tiff.push(...[...date].map((c) => c.charCodeAt(0)), 0);
    const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    const bytes = [0xff, 0xd8, 0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff, ...exif, 0xff, 0xd9];
    return new Uint8Array(bytes).buffer;
}

describe('exifDateTaken', () => {
    it('reads DateTimeOriginal in both byte orders', () => {
        const expected = new Date(2026, 2, 4, 9, 15, 30).toISOString();
        expect(exifDateTaken(jpegWithDate('2026:03:04 09:15:30'))).toBe(expected);
        expect(exifDateTaken(jpegWithDate('2026:03:04 09:15:30', false))).toBe(expected);
    });

    it('ignores non-JPEGs and garbage', () => {
        expect(exifDateTaken(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeUndefined();
        expect(exifDateTaken(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 4, 1, 2]).buffer)).toBeUndefined();
        expect(exifDateTaken(jpegWithDate('0000:00:00 00:00:00'))).toBeUndefined();
    });
});
