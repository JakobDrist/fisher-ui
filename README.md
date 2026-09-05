# Fisher UI

Expressive React components with thoughtful motion and interaction. Explore 118 components and UI blocks, install the ones you need, and make them your own.

[Explore the library](https://jakobfisker.dk/en/ui) · [Try Liquid Metal](https://jakobfisker.dk/en/ui/components/liquid-metal)

## Installation

Add a component to your project with the shadcn CLI. Start with **Liquid Metal**, a button with a reflective, fluid surface:

```sh
npx shadcn@latest add https://jakobfisker.dk/r/liquid-metal.json
```

For another component, find it in the [library](https://jakobfisker.dk/en/ui) and copy its installation command.

Each component installs independently. The CLI copies its source and required helpers into your project, installs its dependencies, and adds any required global styles. You can then edit the installed files to fit your design.

## Requirements

- React 19 and TypeScript.
- Tailwind CSS 4.
- An existing project configured with shadcn/ui.

Some components require Next.js. WebGPU components require a compatible browser and HTTPS or localhost; check the component's documentation for specific requirements.

## Browse the source

Components are organized by name, with shared utilities kept together:

```text
components/
  liquid-metal/
  prompt-input-2/
  receipt-printer/
  shared/
  ...
gpu/
public/
catalog.json
```

- **`components/`** — component source, styles, and shared helpers.
- **`gpu/`** — editable WebGPU demo runtimes.
- **`public/`** — required assets and compiled GPU runtimes.
- **`catalog.json`** — component files, dependencies, and style configuration.

## Local development

Clone the repository and check the component source:

```sh
git clone https://github.com/JakobDrist/fisher-ui.git
cd fisher-ui
npm ci
npm run typecheck
```

To rebuild the GPU runtimes after editing files in `gpu/`:

```sh
npm run build:gpu
```

This repository contains component source. View the interactive previews and installation instructions on the [Fisher UI website](https://jakobfisker.dk/en/ui).
