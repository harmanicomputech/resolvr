/** Gentle haptic feedback where supported (Android browsers). Silent elsewhere. */
export function haptic(pattern: 'tap' | 'success' | 'error'): void {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    const patterns = { tap: 8, success: [12, 40, 12], error: [30, 50, 30] };
    try {
        navigator.vibrate(patterns[pattern]);
    } catch {
        // Some browsers throw when vibration is blocked by policy.
    }
}
