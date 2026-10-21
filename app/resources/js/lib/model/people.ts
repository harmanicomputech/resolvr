/** Turn free-text names into a stable matching key: "J. Smith " → "j smith". */
export function normalizeName(name: string): string {
    return name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Split a free-text list of names ("Ann, Bo and Cy; Di") into names. */
export function splitNames(list: string): string[] {
    return list
        .split(/,|;|\n|\band\b|&/i)
        .map((n) => n.trim())
        .filter(Boolean);
}
