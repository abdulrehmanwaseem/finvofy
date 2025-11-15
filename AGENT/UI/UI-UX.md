# UI/UX Brief — Supabase-Inspired

Goal: Deliver a clean, modern, dark-first dashboard experience similar to Supabase (https://supabase.com), using Tailwind + shadcn/ui with the Supabase theme for rapid, consistent styling.

## Design Principles

- Minimal, content-first surfaces with strong hierarchy
- Dark mode as default; light mode supported
- High-contrast accent color (Supabase-like green) for primary actions
- Smooth micro-interactions; avoid heavy/flashy animations
- Accessible by default (keyboard nav, focus rings, color contrast)

## Visual Language

- Colors: Use shadcn theme (Supabase preset) for tokens. Dark surfaces, subtle borders, green accents for primary actions and success states.
- Typography: Inter (or system UI fallback). Use 600–700 for titles, 400–500 for body.
- Spacing: 8px scale (4/8/12/16/24/32). Generous padding for cards/tables.
- Corners: Medium radius on cards/inputs; slightly larger on modals/sheets.
- Depth: Subtle shadows on floating elements; thin borders for structure.

## Core Layout

- Global shell: Left sidebar navigation + top bar (search, quick actions, user menu).
- Page container: Max width on content (e.g., 1280–1440px) with responsive gutters.
- Sections: Cards for summaries, tables for data, side panels for edit flows.
- Public pages (invoice/pay): Focused, distraction-free, with prominent Pay CTA.

## Key Components (shadcn/ui)

- Navigation: Sidebar (collapsible) with icons + active state, Breadcrumbs.
- Topbar: Search input, “New Invoice” button, notifications, user menu.
- Cards: KPI stats, recent activity, empty states with CTA.
- Tables: Sticky header, row hover, bulk selection, responsive collapse on mobile.
- Forms: Inputs, selects, date pickers, inline validation, helper text.
- Overlays: Dialog (modals), Sheet (slide-over), Dropdown Menu, Toasts.
- Misc: Tabs, Badge, Avatar, Pagination, Skeleton, Tooltip, Alert.

Recommended shadcn components to add early:
`button`, `input`, `label`, `card`, `table`, `dialog`, `sheet`, `dropdown-menu`, `toast`, `tabs`, `badge`, `avatar`, `breadcrumb`, `pagination`, `skeleton`, `form`, `tooltip`, `alert`.

## Motion & Interactions

- 150–250ms transitions for hover/focus/press.
- Easing: `ease-out` for entry, `ease-in` for exit.
- Micro-interactions: Button press states, table row hover, toast slide-in.
- Avoid parallax/heavy effects; keep the interface calm and responsive.

## Accessibility

- Keyboard reachable: All interactive controls tab-order friendly.
- Focus visible: Clear green-tinted ring for primary components.
- Contrast: Respect WCAG AA for text and essential UI states.
- Reduced motion: Honor `prefers-reduced-motion` for animations.

## Theme Setup (shadcn + Supabase theme)

Use the Supabase theme via tweakcn to align tokens with Supabase’s visual style.

Command (pnpm):

```powershell
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/supabase.json
```

Notes:

- Ensure Tailwind and shadcn/ui are installed in the Next.js app.
- The command adds theme tokens (CSS variables) and component styles.
- Set dark mode default (e.g., `class` strategy) and include `.dark` theme variables.

## Page Mappings (from PROJECT_OVERVIEW.md)

- Dashboard: KPIs (Card grid), recent activity (Table/List), quick actions (Buttons/Sheet).
- Invoices: Data Table with filters, bulk actions, row preview.
- Invoice Editor: Form grid with line items table; live preview pane.
- Public Invoice: Minimal layout, prominent Pay button + summary.
- Customers: Table + detail side panel (Sheet) for quick edits.
- Payments: Table, status badges, filters, export.
- Templates: Editor surface (WYSIWYG or code), preview, save versioning.
- Settings/Billing: Forms with grouped sections, tabs for categories.

## Token Usage Guidelines

- Primary: Green accent for CTAs, links-on-hover, success.
- Secondary/Muted: Greys for secondary actions and surfaces.
- Destructive: Red hue reserved for delete/refund actions.
- Borders: Low-contrast greys for separation without heavy lines.

## Example Tailwind Practices

- Prefer utility-first with a small set of design tokens.
- Extract complex patterns into `ui/*` components.
- Use `variant` props on components for size/intent (primary/secondary/ghost/outline).
- Use `container mx-auto px-4 sm:px-6 lg:px-8` for page shells.

## Quick Checklist (Next Steps)

1. Run the theme install command (above) to import Supabase-like tokens.
2. Add core shadcn components listed under “Key Components”.
3. Wire global layout (Sidebar + Topbar) and set dark mode default.
4. Implement Dashboard cards + Table with sample data.
5. Add Toast provider and base Dialog/Sheet infrastructure.
6. Validate focus rings, color contrast, and keyboard flows.

## Motion Library

**Default:** Use `react-motion` for micro-interactions and small UI transitions (e.g., hover states, dropdown entries, toast slides).

- Install:

```powershell
pnpm add react-motion
```

**Allow:** If an imported component from a registry (see Component Registries section below) requires Framer Motion, include `framer-motion` for that component only.

- Install:

```powershell
pnpm add framer-motion
```

**Guidelines:**

- Prefer `react-motion` for custom animations to keep bundle size lean.
- Use `framer-motion` sparingly when registry components depend on it (e.g., Aceternity UI, Animate UI).
- Keep all motion timings in the 150–250ms range for consistency.

## Component Registries

This project uses the shadcn CLI to pull components from official and community registries. For a full list and usage patterns, see [shadcn-registries.md](./shadcn-registries.md).

**Primary theme:** Supabase theme via Tweakcn (already configured above).

**Key registries to explore:**

- **shadcn/ui** (official) — https://ui.shadcn.com
- **Tweakcn** (themes) — https://tweakcn.com
- **Origin UI** — https://originui.com
- **Aceternity UI** (animated components) — https://ui.aceternity.com
- **Magic UI** — https://magicui.design
- **ui.pub** — https://uipub.com

**Add a component from a registry:**

```powershell
pnpm dlx shadcn@latest add <component-name-or-url>
```

Example (adding the button component):

```powershell
pnpm dlx shadcn@latest add button
```

Example (adding a custom theme or component from a registry):

```powershell
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/supabase.json
```

Refer to the full registry hub at https://registry.directory for more options.

## AI Agent Implementation Notes

When building features:

1. Start with shadcn component primitives (button, input, card, table, dialog, sheet).
2. Use `react-motion` for custom animations; fallback to `framer-motion` if a registry component requires it.
3. Reference [shadcn-components.md](./shadcn-components.md) for the full list of 350+ available components.
4. Pull from registries listed in [shadcn-registries.md](./shadcn-registries.md) for specialized components (charts, animations, advanced forms).
5. Keep dark mode as default; use Supabase theme tokens for consistency.
6. Validate all interactive elements for keyboard accessibility and focus rings.

If you want, I can scaffold the Next.js UI shell with Tailwind + shadcn/ui and wire this theme into a starter layout (sidebar/topbar, cards, and a data table) in this repo.
