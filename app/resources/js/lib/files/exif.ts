/**
 * Read the "date taken" (EXIF DateTimeOriginal) from a JPEG, so a photo's
 * own capture time can be shown next to when it was added. Minimal and
 * dependency-free; returns undefined for anything it does not understand.
 * EXIF times have no time zone, so they are read as device-local time.
 */
export function exifDateTaken(buffer: ArrayBuffer): string | undefined {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return undefined;
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        const size = view.getUint16(offset + 2);
        if (marker === 0xffe1 && size >= 8 && view.getUint32(offset + 4) === 0x45786966) {
            return readTiff(view, offset + 10);
        }
        if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return undefined;
        offset += 2 + size;
    }
    return undefined;
}

function readTiff(view: DataView, tiff: number): string | undefined {
    if (tiff + 8 > view.byteLength) return undefined;
    const little = view.getUint16(tiff) === 0x4949;
    const u16 = (o: number) => view.getUint16(o, little);
    const u32 = (o: number) => view.getUint32(o, little);
    const find = (ifd: number, tag: number): number | undefined => {
        if (ifd + 2 > view.byteLength) return undefined;
        const count = u16(ifd);
        for (let i = 0; i < count; i++) {
            const entry = ifd + 2 + i * 12;
            if (entry + 12 > view.byteLength) return undefined;
            if (u16(entry) === tag) return entry;
        }
        return undefined;
    };
    const ifd0 = tiff + u32(tiff + 4);
    const exifPointer = find(ifd0, 0x8769);
    const exifIfd = exifPointer !== undefined ? tiff + u32(exifPointer + 8) : undefined;
    const entry = (exifIfd !== undefined && find(exifIfd, 0x9003)) || find(ifd0, 0x0132);
    if (!entry) return undefined;
    const start = tiff + u32(entry + 8);
    if (start + 19 > view.byteLength) return undefined;
    let text = '';
    for (let i = 0; i < 19; i++) text += String.fromCharCode(view.getUint8(start + i));
    const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
    if (!m) return undefined;
    const [, y, mo, d, h, mi, s] = m.map(Number) as number[];
    const date = new Date(y!, mo! - 1, d!, h!, mi!, s!);
    return Number.isNaN(date.getTime()) || y! < 1990 ? undefined : date.toISOString();
}
