# Maya UI

A premium mobile-first AI Workspace interface. Built with React, TypeScript, Vite, and Tailwind CSS.

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite 7](https://vite.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- [React Router 7](https://reactrouter.com)
- [Framer Motion](https://www.framer.com/motion)
- [Lucide React](https://lucide.dev)
- [Zustand](https://zustand.docs.pmnd.rs) — UI-only state

## Getting started

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Project structure

```
src/
  app/          # App root, router
  components/
    Chat/       # Chat-specific components
    Workspace/  # App shell, header, bottom sheet
    Drawer/     # Navigation drawer
    Input/      # Composer, input toolbar
    Status/     # Typing indicator, model badge
    Model/      # Model picker
    Common/     # Shared primitives (Button, Logo, Skeleton)
  pages/        # Route-level pages
  hooks/        # Shared React hooks
  store/        # Zustand UI state
  lib/          # Utilities (cn)
  assets/       # Static assets
  styles/       # Global styles, theme tokens
  types/        # Shared TypeScript types
```

## Scope

This is the UI foundation only. No business logic, no API integrations, and no fake backend — everything is presentational and ready for real features.
