# Fisher UI components

This repository contains the editable source of 118 ready Fisher UI components, shared helpers, hooks and required assets. It contains no website application, library landing page, personal CV, environment files or portfolio Git history. Developer-labelled components are excluded.

## Install a component

Use the command on that component's Fisher UI documentation page:

```sh
npx shadcn@latest add https://YOUR-FISHER-UI-DOMAIN/r/prompt-input-2.json
```

Each component can be installed independently. The CLI also installs its npm dependencies and global CSS. `catalog.json` maps every component to its files, dependencies, CSS and original source.

## Read or check all source

```sh
npm ci
npm run typecheck
```

The source tree matches the shadcn installation layout under `components/fisher-ui/`. React 19, TypeScript and Tailwind CSS 4 are the consumer baseline; components using Next.js or WebGPU require those runtimes. This repository is source-only and does not run the showcase website.

## Updates

This is a generated source mirror. Edit components in the main Fisher UI project, then regenerate the export using `npm run registry:export -- /path/to/a/new-directory`. Copy the resulting files into this repository and review the diff before committing. Direct edits here are not automatically imported back into the website. Cross-repository automatic publishing has not been configured.

## Attribution

Original source references are retained in `catalog.json`; existing copyright comments and component-local license notices are included. No blanket replacement license is asserted for third-party components.
