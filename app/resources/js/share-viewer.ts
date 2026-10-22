import { openBundle, unpackBundle, type ShareManifest, type SharedFile, type SharedIncident } from './lib/share/bundle';

/*
 * The read-only share viewer (/s/{id}#key). It fetches the encrypted bundle,
 * decrypts it here with the key from the #fragment (never sent to the
 * server), and renders it. Text from the bundle is only ever set with
 * textContent, never parsed as HTML.
 */

type Child = Node | string | null | undefined | false;

function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    for (const c of children) if (c) el.append(c);
    return el;
}

const root = document.getElementById('share')!;
const shareId = root.dataset.shareId!;
const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' });

if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');

function show(...nodes: Child[]) {
    root.replaceChildren(...(nodes.filter(Boolean) as (Node | string)[]));
}

function message(title: string, body: string) {
    show(
        h(
            'div',
            { class: 'card mx-auto mt-10 max-w-md p-6 text-center' },
            h('h1', { class: 'font-display text-xl font-semibold text-fg' }, title),
            h('p', { class: 'mt-2 text-sm text-fg-muted' }, body),
        ),
    );
}

const severityLabel: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

function field(label: string, value: string | string[] | undefined): Child {
    const text = Array.isArray(value) ? value.filter(Boolean).join(', ') : value?.trim();
    if (!text) return null;
    return h(
        'div',
        { class: 'py-2' },
        h('dt', { class: 'eyebrow' }, label),
        h('dd', { class: 'mt-1 text-sm whitespace-pre-wrap text-fg' }, text),
    );
}

function fileLink(file: SharedFile, bytes: Uint8Array<ArrayBuffer>): HTMLElement {
    const url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType || 'application/octet-stream' }));
    const isImage = file.mimeType.startsWith('image/') && file.mimeType !== 'image/svg+xml';
    return h(
        'li',
        { class: 'card overflow-hidden p-0' },
        isImage ? h('img', { src: url, alt: file.name, class: 'max-h-80 w-full bg-raised object-contain' }) : null,
        h(
            'div',
            { class: 'flex items-center gap-3 p-3 text-sm' },
            h('span', { class: 'min-w-0 flex-1 truncate text-fg' }, file.name),
            h('a', { href: url, download: file.name, class: 'btn', 'data-size': 'sm' }, 'Download'),
        ),
        h('p', { class: 'mono px-3 pb-3 text-[11px] break-all text-fg-subtle' }, `SHA-256 ${file.sha256}`),
    );
}

function incidentCard(
    incident: SharedIncident,
    files: Map<string, SharedFile>,
    bytesOf: (f: SharedFile) => Uint8Array<ArrayBuffer>,
): HTMLElement {
    const attached = incident.fileIds.map((id) => files.get(id)).filter((f): f is SharedFile => Boolean(f));
    return h(
        'article',
        { class: 'card p-5 sm:p-6', 'aria-labelledby': `t-${incident.incId}` },
        h(
            'div',
            { class: 'flex flex-wrap items-center gap-2 text-sm text-fg-muted' },
            h('span', { class: 'mono' }, incident.incId),
            h('span', {}, fmtDate(incident.occurredAt)),
            h(
                'span',
                { class: 'sev', 'data-severity': incident.severity },
                severityLabel[incident.severity] ?? incident.severity,
            ),
        ),
        h(
            'h2',
            { id: `t-${incident.incId}`, class: 'mt-2 font-display text-lg font-semibold text-fg' },
            incident.title,
        ),
        h('p', { class: 'mt-1 text-sm text-fg-muted' }, incident.types.join(' · ')),
        h(
            'dl',
            { class: 'mt-3 divide-y divide-hairline' },
            field('What happened', incident.description),
            field('Where', incident.location),
            field('Person responsible', incident.responsible),
            field('Witnesses', incident.witnesses),
            field('Others affected', incident.othersAffected),
            field('Context', incident.context),
            field('How often', incident.frequency),
            field('How I responded', incident.response),
            field('Reported', incident.reported),
            field('Impact', incident.impacts),
            field('Impact statement', incident.impactStatement),
            field('Evidence captured', incident.evidenceCaptured),
            field('Notes', incident.additionalNotes),
        ),
        incident.annotations.length
            ? h(
                  'div',
                  { class: 'mt-3' },
                  h('p', { class: 'eyebrow' }, 'Added later'),
                  h(
                      'ul',
                      { class: 'mt-1 space-y-1 text-sm' },
                      ...incident.annotations.map((a) =>
                          h('li', {}, h('span', { class: 'text-fg-muted' }, `${fmtDate(a.at)}: `), a.text),
                      ),
                  ),
              )
            : null,
        attached.length
            ? h(
                  'ul',
                  { class: 'mt-4 grid gap-3 sm:grid-cols-2', 'aria-label': 'Evidence' },
                  ...attached.map((f) => fileLink(f, bytesOf(f))),
              )
            : null,
        h(
            'p',
            { class: 'mono mt-4 text-[11px] break-all text-fg-subtle' },
            `Logged ${fmtDate(incident.loggedAt)} · record hash ${incident.hash}`,
        ),
    );
}

function render(
    manifest: ShareManifest,
    bytesOf: (f: SharedFile) => Uint8Array<ArrayBuffer>,
    expiresAt: string | null,
) {
    const files = new Map(manifest.files.map((f) => [f.id, f]));
    const incidents = [...manifest.incidents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    document.title = `${manifest.author ? `${manifest.author}: ` : ''}shared record · Resolvr`;
    show(
        h(
            'header',
            { class: 'mb-6' },
            h('p', { class: 'font-display text-sm font-semibold text-accent-text' }, 'Resolvr · shared record'),
            h(
                'h1',
                { class: 'mt-2 font-display text-3xl font-semibold tracking-tight text-fg' },
                manifest.author ? `Workplace record of ${manifest.author}` : 'Workplace incident record',
            ),
            h(
                'p',
                { class: 'mt-2 text-sm text-fg-muted' },
                `${incidents.length} ${incidents.length === 1 ? 'incident' : 'incidents'} · ${manifest.files.length} ${manifest.files.length === 1 ? 'file' : 'files'} · shared ${fmtDay(manifest.createdAt)}${expiresAt ? ` · link ends ${fmtDate(expiresAt)}` : ''} · ${manifest.jurisdiction}`,
            ),
            manifest.note
                ? h(
                      'blockquote',
                      { class: 'card mt-4 p-4 text-sm whitespace-pre-wrap text-fg' },
                      h('p', { class: 'eyebrow mb-1' }, 'Note from the sender'),
                      manifest.note,
                  )
                : null,
            h(
                'p',
                { class: 'mt-4 text-xs text-fg-subtle' },
                'Read-only. Decrypted in this browser: the server that delivered it cannot read it. Each incident shows the hash recorded when it was logged; each file shows its SHA-256 fingerprint. Not legal advice.',
            ),
            h(
                'button',
                { type: 'button', class: 'btn mt-4 print:hidden', 'data-size': 'sm', id: 'print' },
                'Print or save as PDF',
            ),
        ),
        h('div', { class: 'space-y-4' }, ...incidents.map((i) => incidentCard(i, files, bytesOf))),
        h('footer', { class: 'mt-10 text-center text-xs text-fg-subtle' }, 'Shared with Resolvr. Not legal advice.'),
    );
    document.getElementById('print')?.addEventListener('click', () => window.print());
}

async function main() {
    const key = location.hash.slice(1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(key))
        return message(
            'The link is incomplete',
            'Ask the sender to copy the whole link again, including the part after the # sign.',
        );
    const response = await fetch(`/api/shares/${shareId}/content`, {
        headers: { Accept: 'application/octet-stream, application/json' },
    });
    if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        return message(
            response.status === 410 ? 'This link is no longer active' : 'This link does not work',
            body.message ?? 'Ask the sender for a new link.',
        );
    }
    show(h('p', { class: 'text-sm text-fg-muted' }, 'Decrypting on this device…'));
    try {
        const plain = await openBundle(new Uint8Array(await response.arrayBuffer()), key);
        const { manifest, file } = unpackBundle(plain);
        render(manifest, (f) => file(f) as Uint8Array<ArrayBuffer>, response.headers.get('X-Share-Expires-At'));
    } catch {
        message(
            'This link could not be opened',
            'The key in the link does not match. Ask the sender to copy the whole link again.',
        );
    }
}

// Pasting the full link into a tab that shows the incomplete one only changes the #fragment.
window.addEventListener('hashchange', () => location.reload());

void main();
