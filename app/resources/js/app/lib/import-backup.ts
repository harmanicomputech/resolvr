import type { Repositories } from '@/lib/db';
import { importPrototype, type ImportReport } from '@/lib/migration/prototype';

/** Ask for a JSON file and import it as a backup from the original Resolvr prototype. */
export function pickAndImportPrototype(repos: Repositories): Promise<ImportReport | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.className = 'sr-only';
        input.dataset.testid = 'import-backup-input';
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return resolve(null);
            file.text()
                .then((text) => importPrototype(JSON.parse(text), repos))
                .then(resolve, reject);
        });
        input.addEventListener('cancel', () => {
            input.remove();
            resolve(null);
        });
        document.body.append(input);
        input.click();
    });
}
