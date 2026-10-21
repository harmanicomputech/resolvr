import { reducedMotion } from './motion';

/**
 * Slot-machine number roll: each digit is a column of 0-9 that slides to the
 * new value. Screen readers get the plain number via aria-label.
 */
export function rollTo(el: HTMLElement, value: number): void {
    const text = String(value);
    el.setAttribute('aria-label', text);

    if (reducedMotion()) {
        el.textContent = text;
        return;
    }

    let columns = Array.from(el.querySelectorAll<HTMLElement>('.roll-col'));
    if (columns.length !== text.length) {
        el.textContent = '';
        el.classList.add('roll');
        columns = Array.from(text, () => {
            const col = document.createElement('span');
            col.className = 'roll-col';
            col.setAttribute('aria-hidden', 'true');
            const strip = document.createElement('span');
            strip.className = 'roll-strip';
            strip.textContent = '0123456789'.split('').join('\n');
            col.append(strip);
            el.append(col);
            return col;
        });
        // Let the browser paint the starting position before rolling.
        void el.offsetWidth;
    }

    Array.from(text).forEach((digit, i) => {
        const strip = columns[i]?.firstElementChild as HTMLElement | null;
        strip?.style.setProperty('--digit', digit);
    });
}
