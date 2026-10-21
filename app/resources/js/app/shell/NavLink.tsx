import type { ComponentProps, MouseEvent } from 'react';

import { useNavigate } from '../hooks/use-navigate';

/** An <a> that navigates client-side with a view transition. Modifier-clicks behave normally. */
export function NavLink({ href, onClick, ...props }: ComponentProps<'a'> & { href: string }) {
    const navigate = useNavigate();
    return (
        <a
            href={href}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                onClick?.(event);
                if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                )
                    return;
                event.preventDefault();
                navigate(href);
            }}
            {...props}
        />
    );
}
