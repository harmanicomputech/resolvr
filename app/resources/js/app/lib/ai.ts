/**
 * Client for the drafting endpoint. Sends only what the caller passes (the
 * studio shows it first) and reads the server-sent event stream back.
 */
export interface DraftPayload {
    mode: 'document' | 'rewrite';
    type: string;
    tone: string;
    outcome?: string;
    jurisdiction: string;
    context?: string;
    details?: Record<string, string>;
    incidents?: Record<string, string>[];
    paragraph?: string;
    instruction?: string;
    surrounding?: string;
}

export class DraftError extends Error {}

function xsrfToken(): string | undefined {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]!) : undefined;
}

async function post(payload: DraftPayload, signal?: AbortSignal): Promise<Response> {
    const send = () =>
        fetch('/ai/complaint', {
            method: 'POST',
            credentials: 'same-origin',
            signal,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                'X-XSRF-TOKEN': xsrfToken() ?? '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        });
    let response = await send();
    // An expired session: load the shell once to get a fresh token, then retry.
    if (response.status === 419) {
        await fetch('/', { credentials: 'same-origin', cache: 'no-store' });
        response = await send();
    }
    return response;
}

/** Stream a draft. Resolves 'done', or 'refused' (discard what arrived). Throws DraftError with a kind message. */
export async function streamDraft(
    payload: DraftPayload,
    onText: (chunk: string) => void,
    signal?: AbortSignal,
): Promise<'done' | 'refused'> {
    if (!navigator.onLine)
        throw new DraftError('Drafting needs an internet connection. Everything else works offline.');
    let response: Response;
    try {
        response = await post(payload, signal);
    } catch (error) {
        if ((error as Error).name === 'AbortError') throw error;
        throw new DraftError('Could not reach Resolvr. Check your connection and try again.');
    }
    if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        if (response.status === 429)
            throw new DraftError('You have drafted a lot in a short time. Please wait a little and try again.');
        if (response.status === 422)
            throw new DraftError('That is more than can be drafted at once. Try fewer incidents or fields.');
        throw new DraftError(body.message ?? 'The draft could not be started.');
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let outcome: 'done' | 'refused' | null = null;
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let end: number;
        while ((end = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const event = /^event: (.+)$/m.exec(block)?.[1];
            const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] ?? '{}') as { text?: string; message?: string };
            if (event === 'delta' && data.text) onText(data.text);
            else if (event === 'done') outcome = 'done';
            else if (event === 'refused') outcome = 'refused';
            else if (event === 'error') throw new DraftError(data.message ?? 'The draft stopped unexpectedly.');
        }
    }
    if (!outcome) throw new DraftError('The draft stopped before it finished. Please try again.');
    return outcome;
}

/** Plain text with blank lines between paragraphs → simple HTML for the editor. */
export function textToHtml(text: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return text
        .trim()
        .split(/\n{2,}/)
        .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('');
}
