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
    AppWindow/  Screenshots captured from the actual app frontend
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

## Preview privacy

The hero displays actual app frontend screenshots, not a separately styled
recreation. Four images in `public/screenshots/` cover Portuguese/English and
dark/light themes.

From the repository root, run `pnpm screenshots` to regenerate them and
`public/og.png`. Requires Google Chrome (`CHROME_BIN` can override the executable).
The script starts temporary Vite servers and a clean, temporary browser profile,
then renders the current app with the isolated native-command fixture in
`scripts/screenshot-fixture.mjs`. It never reads personal folders or profile data.
Keep all fixture paths, filenames and metadata fictional; native commands not
explicitly mocked are blocked. Inspect the generated images before publishing.
The repository/author links are intentional public credits, not demo file data.

## Deployment

`.github/workflows/pages.yml` builds the site and deploys `web/dist` through the
GitHub Pages Actions flow on every push to `master` that touches `web/`.

For a project site the base path is `/cosmarium/` (set in `vite.config.ts`).
In the repository settings, set **Pages → Build and deployment → Source** to
**GitHub Actions**. For a custom domain or a differently named repository,
update `base` in `vite.config.ts` and the canonical/Open Graph URLs in
`index.html`.
