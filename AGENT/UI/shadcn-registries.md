# Shadcn Registries & Usage

Link hub: https://registry.directory

This doc lists registries you can pull from with the shadcn CLI and notes for usage. Most registries provide a JSON endpoint or per-component links — copy their "Add" URL into the CLI.

## Registries

- shadcn/ui — https://ui.shadcn.com
- shadcn/ui registry preview — https://ui.shadcn.com
- ui.pub — https://uipub.com
- Tweakcn — https://tweakcn.com
- Origin UI — https://originui.com
- Aceternity UI — https://ui.aceternity.com
- Shadcn UI Blocks — https://shadcnui-blocks.com
- Shadcn Form Builder — https://shadcn-form.com
- Shadcn Blocks — https://shadcnblocks.com
- Algolia SiteSearch — https://sitesearch.algolia.com
- StyleGlide — https://www.styleglide.ai
- Neobrutalism components — https://neobrutalism.dev
- kokonut/ui — https://kokonutui.com
- Magic UI — https://magicui.design
- Cult UI — https://cult-ui.com
- Kibo UI — https://kibo-ui.com
- ReUI — https://reui.io
- RetroUI — https://retroui.dev
- Skiper UI — https://skiper-ui.com
- JollyUI — https://www.jollyui.dev
- React Bits — https://reactbits.dev
- WDS Shadcn Registry — https://wds-shadcn-registry.netlify.app
- Animate UI — https://animate-ui.com
- AI Elements — https://ai-sdk.dev
- Shadcn.IO — https://shadcn.io
- Dice UI — https://www.diceui.com
- ElevenLabs UI — https://ui.elevenlabs.io
- 8bitcn — https://www.8bitcn.com
- pqoqubbw/icons — https://icons.pqoqubbw.dev
- Intent UI — https://intentui.com
- Design Intent UI — https://design.intentui.com
- Eldora UI — https://www.eldoraui.site
- shadcn/studio — https://shadcnstudio.com
- Shadix UI — https://shadix-ui.vercel.app
- HextaUI — https://hextaui.com

## Using with shadcn CLI

1. Initialize (in a Next.js/Tailwind app):

```powershell
pnpm dlx shadcn@latest init
```

2. Add from official registry (example: button):

```powershell
pnpm dlx shadcn@latest add button
```

3. Add from a custom registry or theme (paste the registry JSON or component link):

```powershell
# Example (Theme) — Tweakcn Supabase theme
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/supabase.json

# General pattern for custom registries (visit the site and copy the component/theme JSON URL)
# pnpm dlx shadcn@latest add <REGISTRY_JSON_OR_COMPONENT_URL>
```

Notes:

- Each registry has its own JSON endpoints and structure — always copy the link they provide.
- The CLI will place components under your configured `components.json` paths.
- Review the diff before confirming to avoid overwriting local changes.

## Motion libraries

Some registries/components rely on Motion libraries for animations.

- Framer Motion (widely used):

```powershell
pnpm add framer-motion
```

- react-motion (alternative):

```powershell
pnpm add react-motion
```

If a specific component requires Framer Motion, prefer `framer-motion`. Many animated registries (e.g., Aceternity, Animate UI) are built with Framer Motion.
