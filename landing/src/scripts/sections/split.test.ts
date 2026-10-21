import { describe, expect, it } from 'vitest';

import { splitWords } from './split';

describe('splitWords', () => {
    it('wraps every word and keeps inline elements and text intact', () => {
        const h1 = document.createElement('h1');
        h1.innerHTML = 'Finally heard. <em>Finally resolved.</em>';
        const words = splitWords(h1);

        expect(words.map((w) => w.textContent)).toEqual(['Finally', 'heard.', 'Finally', 'resolved.']);
        expect(h1.textContent).toBe('Finally heard. Finally resolved.');
        expect(h1.querySelectorAll('em .word')).toHaveLength(2);
    });
});
