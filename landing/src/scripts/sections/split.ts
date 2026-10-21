/**
 * Wrap each word of an element in .word > .word-inner for mask-up reveals,
 * preserving inline elements such as <em>. The original text stays in the DOM
 * (only wrapped), so it remains readable and selectable.
 */
export function splitWords(root: HTMLElement): HTMLElement[] {
    const inners: HTMLElement[] = [];

    const walk = (node: Node) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                const parts = (child.textContent ?? '').split(/(\s+)/);
                const frag = document.createDocumentFragment();
                for (const part of parts) {
                    if (!part) continue;
                    if (/^\s+$/.test(part)) {
                        frag.append(document.createTextNode(part));
                        continue;
                    }
                    const word = document.createElement('span');
                    word.className = 'word';
                    const inner = document.createElement('span');
                    inner.className = 'word-inner';
                    inner.textContent = part;
                    word.append(inner);
                    frag.append(word);
                    inners.push(inner);
                }
                child.replaceWith(frag);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                walk(child);
            }
        }
    };

    walk(root);
    return inners;
}
