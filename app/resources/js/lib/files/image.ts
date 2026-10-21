/**
 * A tiny blurred preview (about 24px wide, as a data URL) and the image's
 * size, stored encrypted with the file's metadata so tiles can show
 * something instantly while the full image decrypts.
 */
export async function imagePreview(blob: Blob): Promise<{ thumb: string; width: number; height: number } | undefined> {
    if (!blob.type.startsWith('image/') || typeof createImageBitmap === 'undefined') return undefined;
    try {
        const bitmap = await createImageBitmap(blob);
        const w = 24;
        const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
        const result = { thumb: canvas.toDataURL('image/jpeg', 0.6), width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return result;
    } catch {
        return undefined;
    }
}
