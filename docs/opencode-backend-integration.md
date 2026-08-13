# Maya UI — OpenCode Backend Integration Report

Phase 2 integration notes for connecting the Maya UI frontend to the
[OpenCode](https://opencode.ai) server (the `mayacli` repository).

## Server

The backend is the OpenCode server, started with:

```bash
opencode serve
```

- Default listen port starts at `4096` and scans upward; the daemon registers
  the chosen address. The Maya UI default points at `http://127.0.0.1:35123`.
- The HTTP surface is defined with Effect `HttpApi` in
  `packages/protocol/src/groups/*` and served from `packages/server/src`.
- OpenAPI document: `GET /openapi.json` (for reference / codegen).

## Endpoints used by Maya UI

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe; `{ "healthy": true }` |
| `POST` | `/api/session` | Create a session; body `{ id?, agent?, model?, location? }` → `{ data: Session.Info }` |
| `GET` | `/api/session` | List sessions; query `limit`, `order`, `cursor` → `{ data, cursor }` |
| `GET` | `/api/session/:sessionID/message` | Message timeline; query `limit`, `order`, `cursor` → `{ data: SessionMessage[], cursor }` |
| `POST` | `/api/session/:sessionID/prompt` | Submit a prompt; body `{ id?, prompt: { text }, delivery?, resume? }` → `{ data: SessionInput.Admitted }` |
| `POST` | `/api/session/:sessionID/interrupt` | Interrupt active execution (no content) |
| `GET` | `/api/event` | SSE event stream (see below) |
| `GET` | `/api/model` | Available models; query `location` |

Additional endpoints exist for agents, providers, files, permissions,
questions, PTYs, commands, skills, references, and project copies — see
`packages/protocol/src/groups/` for the full list.

## Streaming

The server exposes a Server-Sent Events stream at `GET /api/event`.

- Content type: `text/event-stream`.
- Each frame is a `data:` line containing a JSON `V2Event`:
  `{ id, type, data, durable?, metadata?, location? }`.
- The stream is infinite; the client aborts it via `AbortController` to stop.

Events relevant to chat (see `packages/schema/src/session-event.ts`):

| `type` | Meaning |
| --- | --- |
| `session.next.text.started` / `.delta` / `.ended` | Assistant text parts (deltas are live-only; `ended` carries the full text) |
| `session.next.reasoning.started` / `.delta` / `.ended` | Reasoning trace (optional to render) |
| `session.next.tool.called` / `.progress` / `.success` / `.failed` | Tool activity |
| `session.next.step.started` / `.ended` / `.failed` | Agent step lifecycle (use to toggle streaming state) |
| `session.next.prompted` / `.prompt.admitted` | Prompt admission |
| `session.next.compaction.*` | Context compaction |

A per-session replay endpoint also exists: `GET /api/session/:sessionID/event`
with `?after=<seq>` replays durable events, then continues live.

## Schemas

- **Session** (`packages/schema/src/session.ts`): `Session.Info` carries
  `id`, `projectID`, `agent?`, `model?`, `cost`, `tokens`, `time`, `title`,
  `location`, `subpath?`.
- **Message** (`packages/schema/src/session-message.ts`): a tagged union on
  `type` — `user`, `assistant`, `system`, `synthetic`, `shell`, `compaction`,
  `agent-switched`, `model-switched`. Assistant messages contain a `content`
  array of `text` / `reasoning` / `tool` parts.
- **Prompt** (`packages/schema/src/prompt-input.ts`): `{ text, files?, agents? }`.

## Env vars (Maya UI)

All optional, defined in `src/lib/env.ts` and mirrored in `.env.example`:

| Var | Meaning |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the OpenCode server. Defaults to the current working tunnel URL (see `src/lib/env.ts`) |
| `VITE_WS_URL` | Reserved for future WebSocket use |
| `VITE_OPENCODE_USERNAME` | Basic auth username (default `opencode` on the server) |
| `VITE_OPENCODE_PASSWORD` | Basic auth password; when set, `Authorization: Basic …` is sent |

## Auth

- The server enables auth when `OPENCODE_SERVER_PASSWORD` is set
  (`packages/server/src/auth.ts`); the username defaults to `opencode`.
- Maya UI sends `Authorization: Basic base64(username:password)` on every
  request when `VITE_OPENCODE_PASSWORD` is configured (`src/lib/env.ts` →
  `authHeaders()`), including the SSE connection.
- Requests without credentials fail with `401` when the server requires auth.

## Client implementation (Maya UI)

- `src/lib/api.ts` — typed fetch client: `health`, `createSession`,
  `listSessions`, `prompt`, `listMessages`, `interrupt`, `listModels`,
  and the `subscribeEvents` SSE generator.
- `src/store/use-chat-store.ts` — Zustand store owning session lifecycle,
  prompt submission, and streaming; it upserts assistant messages on
  `text.delta`/`reasoning.delta` and settles them on `text.ended` /
  `step.ended` / `step.failed`.
- `src/components/*` — ChatInput submits prompts, ChatConversation renders the
  message list with auto-scroll, ChatStatusBar surfaces connection/streaming
  state and retry, and the Workspace sheet's Stop Task calls `/interrupt`.
