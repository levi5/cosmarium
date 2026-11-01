# Cosmarium website

Static site for <https://levi5.github.io/cosmarium/>, built with React, TypeScript
and Vite. It follows the desktop app's component structure and design tokens so
the site and the product look like the same project.

## Structure

```txt
src/
  assets/       Logo and imported images
  components/   One folder per component, with a co-located styles.css
    base/       Button, Icon, SectionHeading, GitHubMark
    AppWindow/  Rendered preview of the file manager
    Header/ Hero/ FeatureGrid/ Shortcuts/ Stack/ Download/ Footer/
  constants/    Repository links and storage keys
  global/       Reset, design tokens and site-wide styles
  hooks/        Scroll reveal observer
  lib/          i18n dictionaries, preferences and clipboard helpers
  pages/Home/   Page composition
```

## Development

```bash
pnpm install
pnpm dev       # http://localhost:1422
pnpm build     # type check + production build in dist/
pnpm preview   # serve the production build
```

Requires Node.js 24+ and pnpm 10+.

## Content and language

All copy lives in `src/lib/i18n.ts` with `pt-BR` and `en` dictionaries. The site
defaults to Portuguese and remembers the visitor's choice in `localStorage`.
Theme (dark/light) works the same way.

## Deployment

`.github/workflows/pages.yml` builds the site and deploys `web/dist` through the
GitHub Pages Actions flow on every push to `master` that touches `web/`.

For a project site the base path is `/cosmarium/` (set in `vite.config.ts`).
In the repository settings, set **Pages → Build and deployment → Source** to
**GitHub Actions**. For a custom domain or a differently named repository,
update `base` in `vite.config.ts` and the canonical/Open Graph URLs in
`index.html`.
