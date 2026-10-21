# Resolvr design system: "Quiet Armour"

Calm, protective, premium, and light by default. Linear's precision, Apple's restraint, warm paper surfaces, one teal accent and lots of clear icons. People open Resolvr when they are stressed, sometimes somewhere they can't be seen doing it. Every decision below follows from that: **trustworthy before flashy**.

| File | What |
| --- | --- |
| `app/resources/css/tokens.css` | All tokens as CSS variables + Tailwind v4 `@theme` mapping. Imported by both `app/` and `landing/`. |
| `app/resources/css/fonts.css` | Self-hosted `@font-face` (files in `app/resources/fonts/`). |
| `app/resources/css/components.css` | Core components as plain CSS classes, shared by both projects. |
| `app/resources/js/components/ui/*` | Typed React wrappers for the app. |
| `app/resources/js/lib/design/motion.ts` | Motion tokens for Motion / GSAP. Shared by both projects. |
| `app/resources/js/lib/design/tokens.test.ts` | Fails the build if any text pair drops below 4.5:1. |
| `/design` (app, local only) | Every token and component in both themes. Run `composer dev` and open http://localhost:8000/design. |

Import order in a stylesheet:

```css
@import 'tailwindcss';
@import '<path>/app/resources/css/tokens.css';
@import '<path>/app/resources/css/components.css';
@custom-variant dark (&:where(.dark, .dark *):not(:where(.light, .light *)));
```

---

## 1. Colour

Light ("Paper") is the default: warm, never pure grey. Dark ("Ink") is opt-in through a toggle (landing: `[data-theme-toggle]` + `public/theme-init.js`, stored as `resolvr-theme` in localStorage). Themes switch with a class: `.dark` or `.light` on any element, nestable.

Tailwind's default palette is **removed** (`--color-*: initial`), so `bg-teal-500` does not exist. Only tokens can be used.

### Surfaces and text

| Token | Utility | Ink | Paper | Use |
| --- | --- | --- | --- | --- |
| `--bg` | `bg-bg` | #07090D | #F7F5F0 | Page background |
| `--surface` | `bg-surface` | #0D1117 | #FFFFFF | Cards, inputs |
| `--raised` | `bg-raised` | #141A22 | #FBFAF7 | Hover, nested cards, selected segment |
| `--overlay` | `bg-overlay` | #19202A | #FFFFFF | Dialogs, sheets, toasts |
| `--inverse` | `bg-inverse` | #F7F5F0 | #0D1117 | Tooltips |
| `--fg` | `text-fg` | #ECEFF3 | #1A1814 | Body and headings |
| `--fg-muted` | `text-fg-muted` | #A3ADBA | #57524A | Secondary text, labels |
| `--fg-subtle` | `text-fg-subtle` | #8A94A3 | #6B655B | Placeholders, metadata (still AA) |
| `--hairline` | `border-hairline` | white 8% | ink 10% | Default borders |
| `--hairline-strong` | `border-hairline-strong` | white 14% | ink 18% | Inputs, chips, emphasis |

### Accent and aurora

| Token | Ink | Paper | Use |
| --- | --- | --- | --- |
| `--accent` | #14B8A6 | #0F766E | Primary button fill, selected states |
| `--accent-text` | #2DD4BF | #0F766E | Links and accent text |
| `--accent-fg` | #03201D | #FFFFFF | Text on an accent fill |
| `--accent-tint` | teal 12% | teal 10% | Selected chip, empty-state icon |
| `--aurora` | teal #14B8A6 → cyan #22D3EE → violet #A78BFA | same | Glows, focus rings, primary CTA edge, ambient light |
| `--aurora-text` | `--aurora` | deeper teal → cyan → violet | `.text-aurora` gradient text |

The aurora is **light, not paint**. Use it for at most one primary CTA per view, focus rings, ambient glows behind hero content, and one gradient phrase per screen.

> **Do** lead with icons: a Lucide icon in an `.icon-badge` beside each card title or list item.
> **Don't** use gradient backgrounds on cards, gradient text, or full-bleed animated effects. Keep it calm.

### Severity

Readable, not screaming. Every level has a base, a 10% tint, a 24% border and a text colour that passes AA on surfaces and on its own tint.

| Level | Base | Ink text | Paper text |
| --- | --- | --- | --- |
| low | #34D399 | #34D399 | #047857 |
| medium | #FBBF24 | #FBBF24 | #92400E |
| high | #FB923C | #FB923C | #9A3412 |
| critical | #F43F5E | #FB7185 | #BE123C |

Use `data-severity="high"` on any element to get `--sev-base / --sev-text / --sev-tint / --sev-border` in scope, or `bg-sev-high-tint`, `text-sev-high-text`, etc.

> **Do** always show the word ("High") next to the colour. Colour is never the only signal.
> **Don't** use critical red for anything that isn't an incident severity or a destructive action. Error messages use `--danger-text`, and the copy stays calm.

### Semantic

`success`, `warning`, `danger`, `info`, each with `-text` and `-tint`. `danger` also has `-fg` for text on a filled danger button.

### Contrast

`tokens.test.ts` parses `tokens.css` and checks every text/background pair above in both themes (AA, 4.5:1). Add new pairs there when you add tokens.

---

## 2. Typography

| Role | Family | Use |
| --- | --- | --- |
| Headlines | **Poppins** 600, tracking −0.025 to −0.03em | Page, section and card titles, stat values, dialog titles |
| Wordmark | **Poppins** 600 | "Resolvr" |
| UI | **Inter** (variable) | Everything else |
| Mono | **Geist Mono** | Incident IDs (`INC-014`), hashes, timestamps |

There is no serif. Fonts are self-hosted (latin subset, `font-display: swap`); Inter and Poppins 600 are preloaded on the landing site. No Google Fonts requests.

Fluid scale from 12px to 96px with `clamp()`, growing between 360px and 1440px viewports:

| Utility | Min → max | Typical use |
| --- | --- | --- |
| `text-2xs` | 12px | Eyebrows, pills |
| `text-xs` | 13px | Hints, metadata |
| `text-sm` | 14 → 15px | Secondary UI text, buttons |
| `text-base` | 16 → 17px | Body, inputs (never below 16px on inputs: iOS zooms) |
| `text-lg` / `xl` | 18 → 24px | Lead paragraphs, card titles |
| `text-2xl` / `3xl` | 24 → 40px | Sub-headings |
| `text-4xl` / `5xl` | 36 → 72px | Section and page titles, stat values |
| `text-6xl` | 52 → 96px | Rarely; the hero uses its own clamp |

To de-emphasise part of a headline, wrap it in `.muted` (colour, not italics).

Helpers: `.wordmark`, `.display`, `.eyebrow`, `.mono`, `.text-aurora`.

> **Do** write "Resolvr" as `<span class="wordmark">Resolvr</span>`.
> **Don't** use italics or gradient text for emphasis in headlines; use `.muted` or the accent colour.

---

## 3. Space, radii, elevation, blur

- **Spacing**: 4px base (`p-1` = 4px, `p-4` = 16px). Prefer 4, 8, 12, 16, 24, 32, 48, 64.
- **Radii**: `rounded-sm` 6 · `rounded-md` 10 (inputs) · `rounded-lg` 16 (cards) · `rounded-xl` 24 (dialogs, sheets) · `rounded-full` (buttons, chips).
- **Elevation**: `shadow-hairline`, `shadow-raised` (cards), `shadow-floating` (glass, toasts), `shadow-overlay` (dialogs), `shadow-glow` (primary CTA). Shadows are soft and layered; dark mode adds an inner top highlight (`inset-shadow-highlight`).
- **Blur**: `--blur-sm` 8px (buttons, scrims) · `--blur-md` 16px (glass) · `--blur-lg` 32px (ambient aurora).

### Glass recipe

`.glass` = translucent `--glass-fill` + `backdrop-filter: blur(16px) saturate(140%)` + a 1px gradient edge (masked `::before`) + fine SVG noise (`::after`). Variants: `data-blur="sm" | "lg"`.

> **Do** use glass for things that float above content: the nav, orbiting hero cards, overlays on the aurora.
> **Don't** stack glass on glass, or use it for dense reading surfaces. Use `.card` there.

---

## 4. Motion

Motion feels like **light moving across glass**, not things bouncing.

| Token | CSS | JS (`motion.ts`) | Use |
| --- | --- | --- | --- |
| instant | `--dur-instant` 120ms | `duration.instant` | Press feedback |
| fast | `--dur-fast` 200ms | `duration.fast` | Hover, colour, small state |
| base | `--dur-base` 320ms | `duration.base` | Sheets, dialogs, list items |
| slow | `--dur-slow` 560ms | `duration.slow` | Section entrances |
| slower | `--dur-slower` 900ms | `duration.slower` | Hero reveals only |
| out-expo | `ease-out-expo` | `ease.outExpo`, `gsapEase.outExpo` | Entrances |
| in-out-quart | `ease-in-out-quart` | `ease.inOutQuart` | Page / section transitions |
| standard | `ease-standard` | `ease.standard` | State changes |
| spring | `ease-spring` (CSS approximation) | `spring.press / gentle / follow` | Interactive elements |

**Rules**

1. Motion explains hierarchy or state. If it doesn't, remove it.
2. Nothing loops forever except ambient background (aurora drift, particles), and even that pauses off-screen.
3. In the app, nothing over 300ms blocks a task. Marketing reveals may be longer.
4. Landing scroll effects are declared with data attributes and run by `landing/src/scripts/effects.ts` (Lenis + GSAP ScrollTrigger): `data-speed` parallax, split-word section titles, `data-stagger` card entrances, `.parallax-img`, `data-draw`, `data-count`, `data-scrub-text`, `data-scale-in`. The module is never loaded under reduced motion.
5. Under `prefers-reduced-motion: reduce`, durations collapse (CSS variables drop to 0–120ms) and JS animations become a short opacity fade. Branch with `reducedMotion()` from `motion.ts`.

> **Do** fade and rise a card 12px with out-expo when it enters.
> **Don't** bounce, wobble, shake (except a PIN error) or use parallax that moves text.

---

## 5. Iconography

Lucide (`lucide-react` in the app, inline SVG on the landing site), 1.5px stroke (set globally on `svg.lucide`), `currentColor`, 16–24px. Decorative icons get `aria-hidden`; icon-only buttons get an `aria-label`. **No emoji in the UI**.

---

## 6. Components

Plain CSS classes in `components.css`; React wrappers in `components/ui`. Variants are data attributes.

| Component | Class / markup | React |
| --- | --- | --- |
| Button | `.btn` + `data-variant="primary \| glass \| ghost \| danger"`, `data-size="sm \| lg \| icon"` | `<Button variant size asChild>` |
| Input / Textarea / Select | `.input`, `.textarea`, `.select`; `aria-invalid="true"` for errors | `<Input>`, `<Textarea>`, `<Select>` |
| Field | `.field > .field-label + control + .field-hint / .field-error` | `<Field label hint error>` (wires id + aria) |
| Chip / Tag | `.chip`; toggle with `aria-pressed` | `<Chip selected onSelectedChange>`, `<Tag>` |
| Severity pill | `.sev` + `data-severity` | `<SeverityPill severity>` |
| Card | `.card` (`data-interactive`), `.glass` | `<Card glass interactive>` |
| Stat | `.stat > .stat-label + .stat-value + .stat-delta` | `<Stat label value delta>` |
| Tabs | `.tabs > .tab[aria-selected]` | `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` (Radix) |
| Segmented control | `.segmented > button[aria-pressed]` | `<SegmentedControl options value onValueChange label>` (Radix) |
| Dialog | `.scrim`, `.dialog`, `.dialog-title`, `.dialog-description` | `<Dialog>`, `<DialogContent title description>` (Radix) |
| Sheet / Drawer | `.sheet[data-side="bottom \| right"]` | `<Sheet>`, `<SheetContent side title>` (Radix) |
| Toast | `.toast[data-tone]` | `<Toast tone title description action>` |
| Tooltip | `.tooltip` | `<Tooltip content>` (Radix) |
| Empty state | `.empty > .empty-icon + .empty-title + .empty-body` | `<EmptyState icon title action>` |
| Skeleton | `.skeleton` | `<Skeleton>` |

### Usage notes

- **One primary button per view.** Everything else is glass or ghost.
- **Danger** buttons are for destructive actions only, and always follow a confirmation that says what will happen ("It moves to trash for 30 days").
- **Inputs** are 44px tall minimum (touch target) and 16px+ text.
- **Dialogs** always have a title and description (screen readers). Sheets slide from the bottom on phones and from the right on desktop.
- **Toasts** are calm: "Incident saved", never "Success!!".

### Voice in components

- Calm and specific: "Couldn't export. Try again." not "Error!".
- Never promise outcomes: "Your record is organised", not "You'll win your case".
- "Not legal advice" appears in the footer, onboarding and every generated document.

---

## 7. Accessibility checklist

- AA contrast for all text (enforced by tests); non-text UI ≥ 3:1.
- Visible focus everywhere: the aurora focus ring (`--focus-ring`) is applied to `:focus-visible` globally.
- Touch targets ≥ 44px. Works one-handed: primary actions sit in the bottom half on phones.
- Severity and status never rely on colour alone.
- Respect `prefers-reduced-motion` (see Motion).

---

## 8. Content Security Policy notes

Both sites run a strict CSP without `'unsafe-inline'`. Consequences for components:

- No `<style>` injection at runtime. In the app, Radix's scroll lock gets the request nonce via `get-nonce` (`app.tsx`). Inertia's built-in progress bar is disabled for the same reason.
- Setting `element.style` from JS (Motion, GSAP) is fine; inline `style="..."` attributes in server-rendered HTML are not.
- Images may use `data:` and `blob:` URLs (the noise texture is a data URI).
