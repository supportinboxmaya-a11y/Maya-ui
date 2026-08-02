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

## Backend

Maya UI connects to the OpenCode server (`opencode serve`). Copy `.env.example` to `.env.local` and point `VITE_API_URL` at your running server:

```
VITE_API_URL=
VITE_OPENCODE_USERNAME=
VITE_OPENCODE_PASSWORD=
```

All variables are optional. When unset, the API defaults to `http://127.0.0.1:35123`. Set `VITE_OPENCODE_PASSWORD` to send Basic auth credentials with every request.

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

The UI is a mobile-first chat surface backed by the OpenCode server. The API client (`src/lib/api.ts`) and chat store (`src/store/use-chat-store.ts`) handle sessions, prompt submission, and streaming events; the remaining components are presentational.
