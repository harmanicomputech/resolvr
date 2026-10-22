import {
    FileText,
    FolderLock,
    HeartHandshake,
    House,
    NotebookPen,
    Settings,
    Users,
    Waypoints,
    type LucideIcon,
} from 'lucide-react';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    /** Also active on these path prefixes. */
    match?: string[];
}

export const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: House },
    { href: '/incidents', label: 'Log', icon: NotebookPen, match: ['/incidents', '/log', '/capture'] },
    { href: '/vault', label: 'Vault', icon: FolderLock },
    { href: '/timeline', label: 'Timeline', icon: Waypoints },
    { href: '/people', label: 'People', icon: Users },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/wellbeing', label: 'Wellbeing', icon: HeartHandshake },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function isActive(item: NavItem, location: string): boolean {
    if (item.href === '/') return location === '/';
    return [item.href, ...(item.match ?? [])].some(
        (prefix) => location === prefix || location.startsWith(`${prefix}/`),
    );
}

/** Title for the top bar. */
export function titleFor(location: string): string {
    return navItems.find((item) => item.href !== '/' && isActive(item, location))?.label ?? 'Home';
}
