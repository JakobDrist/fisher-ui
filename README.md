# Fisher UI components

This repository contains the editable source of 118 ready Fisher UI components, shared helpers, hooks and required assets. It contains no website application, library landing page, personal CV, environment files or portfolio Git history. Developer-labelled components are excluded.

## Install a component

Use the command on that component's Fisher UI documentation page:

```sh
npx shadcn@latest add https://jakobfisker.dk/r/prompt-input-2.json
```

Each component can be installed independently. The CLI also installs its npm dependencies and global CSS. `catalog.json` maps every component to its files, dependencies and CSS.

## Read or check all source

```sh
npm ci
npm run typecheck
```

Source is organized by component name under `components/`, with reused helpers in `components/shared/`. This source mirror uses a simpler layout than the website's install registry. React 19, TypeScript and Tailwind CSS 4 are the consumer baseline; components using Next.js or WebGPU require those runtimes. This repository is source-only and does not run the showcase website.

Editable WebGPU originals live in `gpu/`, with their compiled iframe assets in `public/`. Run `npm run build:gpu` to rebuild them. The TypeScript check covers the installable React source; the GPU originals are compiled by Vite with the TypeGPU plugin.

## Updates

This is a generated source mirror. Edit components in the main Fisher UI project, then regenerate the export using `npm run registry:export -- /path/to/a/new-directory`. Copy the resulting files into this repository and review the diff before committing. Direct edits here are not automatically imported back into the website. Cross-repository automatic publishing has not been configured.

## Attribution

Existing copyright comments and component-local license notices are retained with their source files. No blanket replacement license is asserted for third-party components.
