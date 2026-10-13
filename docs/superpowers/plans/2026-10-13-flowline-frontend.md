# Flowline Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Flowline" — a dark, Linear-inspired React frontend covering 100% of the existing kanban backend's features (auth, boards, columns, cards, roles, realtime collaboration, private invites, public share links), plus a short marketing landing page, plus redesigned backend emails.

**Architecture:** Vite + React 19 + Tailwind CSS v4 SPA. TanStack Query holds all server state; socket.io events write directly into the query cache (single source of truth). Zustand stores hold auth (persisted), toasts, and presence/ephemeral-activity state. dnd-kit powers column/card drag & drop with optimistic updates. Vite dev-proxy forwards `/api` and `/socket.io` to the Express backend on port 8080, so no CORS/env config is needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), react-router-dom v7, @tanstack/react-query v5, zustand v5, socket.io-client v4, @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities, lucide-react.

**Spec:** This document is the spec (approved design is embedded below).

## Global Constraints

- **Backend base URL:** same-origin via Vite proxy. All REST calls go to `/api/...`. Socket connects to same origin (default path `/socket.io`).
- **Backend runs on** `http://localhost:8080` (`npm run dev` in `backend/`). Frontend dev server is Vite default `http://localhost:5173`.
- **Auth:** JWT returned by signin/signup; sent as `Authorization: Bearer <token>` header; stored in localStorage via zustand persist under key `flowline-auth`. Token expires after 7 days.
- **Theme:** dark-only. Background `#08090a`, surfaces `#0f1011`/`#141516`, hairline borders `rgba(255,255,255,0.08)`, headings `#f7f8f8`, muted text `#8a8f98`, faint text `#62666d`, accent indigo `#5e6ad2` (hover `#6e78e0`), danger `#eb5757`. Font: Inter. `color-scheme: dark`.
- **Brand name:** "Flowline" (logo text, page title, emails).
- **No new component library** — all UI primitives are hand-built Tailwind components in `src/components/ui/`.
- **Response envelope:** every backend response is JSON `{ success: boolean, message?: string, ...data }`. Treat `!res.ok || body.success === false` as an error and surface `body.message`.
- **Roles:** `OWNER > EDITOR > VIEWER`. OWNER-only: board update/delete, member role changes/removals, invites, public link management. EDITOR+: column/card CRUD + moves. VIEWER: read-only.
- **Lint/build gate:** every task that adds code must end with `npm run build` (runs `tsc -b && vite build`) passing, in the `frontend/` directory. Lint: `npm run lint` (oxlint).
- **Do not modify backend files** except Task 14 (emails).

---

## Backend API Reference (verified against `backend/src/routes/`)

All authed routes require `Authorization: Bearer <token>`.

### Auth — `/api/auth` (rate-limited: 20 req / 15 min)

| Method & Path | Body | Success response |
|---|---|---|
| POST `/signup` | `{email, password (min 8), name (min 2)}` | `{token, data:{id,name,email}}` |
| POST `/signin` | `{email, password}` | `{token, data:{id,name,email}}` |
| GET `/me` | — | `{data:{id,name,email}}` |
| PATCH `/me` | `{name?, email?}` | `{data:{id,name,email}}` |
| POST `/change-password` | `{currentPassword, newPassword (min 8)}` | `{message}` |
| POST `/forgot-password` | `{email}` | `{message}` (always success-shaped) |
| POST `/reset-password` | `{token, password (min 8)}` | `{message}` |

### Boards — `/api/board` (authed)

| Method & Path | Body | Success response |
|---|---|---|
| POST `/` | `{name, description?}` | `{data:{board, columns}}` (3 default columns: To Do, In Progress, Done) |
| GET `/` | — | `{boards: Board[], shared: (Board & {role, owner:{id,name}})[]}` |
| GET `/:boardId` | — | `{data: BoardDetail, role: "OWNER"\|"EDITOR"\|"VIEWER"}` |
| PATCH `/:boardId` | `{name?, description?}` (OWNER) | `{updatedBoard}` |
| DELETE `/:boardId` | — (OWNER) | `{id}` |
| GET `/:boardId/members` | — | `{boardMembers: BoardMember[]}` |
| PATCH `/:boardId/members/:userId/role` | `{role:"EDITOR"\|"VIEWER"}` (OWNER) | `{updatedMember}` |
| DELETE `/:boardId/members/:userId` | — (OWNER) | `{deletedMember}` |

`BoardDetail` = Board + `columns: (Column & {cards: Card[]})[]` (ordered) + `publicLink: {id,boardId,token,enabled} | null` + `members: (BoardMember & {user:{name,email}})[]`. **Owner is NOT in `members`** — owner identity is `board.ownerId`.

### Columns — `/api/column` (authed, EDITOR+)

| Method & Path | Body | Notes |
|---|---|---|
| POST `/:boardId` | `{name}` | Appends at end. Returns `{data:{board, newColumn}}` |
| PATCH `/:boardId/columns/:columnId` | `{name}` | Rename. Returns `{updatedColumn}` |
| PATCH `/:boardId/position` | `{columns: [{columnId, position}]}` | **Must include EVERY column** of the board with its new 1-based position, else 404 |
| DELETE `/:boardId/columns/:columnId/delete` | — | Returns `{data: updatedColumns}` (re-indexed; **no cards on these objects**) |

### Cards — `/api/card` (authed, EDITOR+)

| Method & Path | Body | Notes |
|---|---|---|
| POST `/:boardId/columns/:columnId/cards` | `{title, description?}` | Appends at end. Returns `{newCard}` |
| PATCH `/:boardId/cards/:cardId` | `{title?, description?}` | Returns `{updatedCard}` |
| PATCH `/:boardId/cards/:cardId/move` | `{newColumnId, oldColumnId, cards: [{cardId, position}]}` | **`cards` must be the FULL ordered list of the destination column's cards (including the moved card)** with new 1-based positions, else 400. Server re-indexes the source column itself. |
| DELETE `/:boardId/card/:cardId` | — | ⚠️ path is `/card/` (singular). Returns `{deletedCardId}` |

### Public share — `/api/public`

| Method & Path | Auth | Body | Notes |
|---|---|---|---|
| POST `/share/:boardId` | OWNER | — | Creates (or returns existing) link. `{token}` |
| GET `/:token` | none | — | `{board: Board & {columns: (Column & {cards: Card[]})[]}}` — 404 if disabled |
| PATCH `/toggle-share/:boardId` | OWNER | `{enabled}` | Disabling evicts read-only sockets |
| DELETE `/share/:boardId/delete` | OWNER | — | Evicts read-only sockets |
| POST `/rotate/:boardId` | OWNER | — | New token. `{token}`. Evicts read-only sockets |

Public URL for visitors: `<frontend-origin>/public/<token>`.

### Private share (invitations) — `/api/private`

| Method & Path | Auth | Body | Notes |
|---|---|---|---|
| POST `/invite/:boardId` | OWNER | `{email, role:"EDITOR"\|"VIEWER"}` | Sends email. 409 if already pending |
| GET `/invite/pending` | authed | — | **My** pending invites: `{boardInvitations: (Invitation & {board, sender:{name,email}})[]}` |
| GET `/invite/pending/:boardId` | OWNER | — | Board's pending invites `{pendingInvitations}` |
| GET `/invite/:token` | none | — | Preview: `{invitation:{boardName, role, status, expiresAt, expired, inviter:{name,email}}}` |
| POST `/invite/:token/accept` | authed | — | Creates membership, emits `member:added` |
| POST `/invite/:token/reject` | authed | — | |
| DELETE `/invite/:invitationId` | OWNER of that board | — | Revoke pending invite |

### Socket.io events (verified against `backend/src/socket/index.ts`)

**Connection:** `io({ auth: { token } })` — token optional. No/invalid token → guest user (`Anonymous <Animal>`, `isGuest: true`).

**Client → Server:**
- `board:join` `{boardId, publicToken?}` — members join authed; guests need a valid enabled `publicToken` (read-only)
- `board:leave` `{boardId}`
- Ephemeral (write access only): `card:creating` `{boardId, columnId}`, `card:editing` `{boardId, cardId}`, `card:moving` `{boardId, cardId}`, `column:creating` `{boardId}`, `column:editing` `{boardId, columnId}`, `column:moving` `{boardId, columnId}`, `action:stop` `{boardId}`

**Server → Client:**
- `presence:update` `{count, users: [{id, name, isGuest}], joined?, left?}`
- `board:updated` `{updatedBoard}` · `board:deleted` `{boardIdDeleted}` · `board:kicked` `{boardId, message?}` · `board:revoked` `{boardId}` · `board:error` `{code, message?}`
- `card:created` `(card)` · `card:updated` `(card)` · `card:moved` `{oldColumn:{columnId, cards}, newColumn:{columnId, cards}}` · `card:deleted` `{cardId}`
- `column:created` `{newColumn}` (**no cards array — add `cards: []` client-side**) · `column:updated` `{updatedColumn}` · `column:moved` `{updatedColumns}` (**no cards — only use for positions**) · `column:deleted` `{columnIdDeleted, updatedColumns}` (same caveat)
- `member:added` `{boardId, member}` · `member:updated` `{boardId, userId, role}` · `member:removed` `{boardId, userId}`
- Ephemeral mirrors: `user:creating`, `user:editing`, `user:moving`, `user:columnCreating`, `user:columnEditing`, `user:columnMoving` — each `{user: {id,name,isGuest}, targetId}` — plus a `:stop` variant of each (e.g. `user:editing:stop`).

**Important:** `io.to(boardId)` broadcasts reach the requester's own sockets too. All cache updaters must be idempotent (dedupe by id on creates).

---

## File Structure (everything under `frontend/src/` unless noted)

```
frontend/
  index.html                     MODIFY — title "Flowline", Inter font links
  vite.config.ts                 MODIFY — dev proxy /api + /socket.io
  src/
    index.css                    MODIFY — Tailwind v4 theme tokens + base styles
    main.tsx                     MODIFY — QueryClientProvider + BrowserRouter
    App.tsx                      MODIFY — all routes + guards
    lib/
      types.ts                   CREATE — all shared TS types
      utils.ts                   CREATE — cn(), initials(), avatarColor(), formatDate()
      api.ts                     CREATE — fetch wrapper + every endpoint function
      socket.ts                  CREATE — socket.io client singleton
    stores/
      auth.ts                    CREATE — zustand persisted {token, user, setAuth, clearAuth}
      toast.ts                   CREATE — zustand {toasts, push, dismiss} + helpers
      presence.ts                CREATE — zustand {users, activity, setters}
    hooks/
      useBoardSocket.ts          CREATE — joins room, wires ALL server events → cache/stores
    components/ui/
      Button.tsx  Input.tsx  Textarea.tsx  Modal.tsx  Dropdown.tsx
      Tooltip.tsx  Avatar.tsx  Badge.tsx  Spinner.tsx  EmptyState.tsx  Toaster.tsx
    components/landing/
      LandingNav.tsx  Hero.tsx  BoardMockup.tsx  Features.tsx  Highlight.tsx  Footer.tsx
    components/app/
      AppLayout.tsx (sidebar + topbar + <Outlet/>)  CreateBoardModal.tsx  InvitationsInbox.tsx
    components/board/
      BoardCanvas.tsx  ColumnView.tsx  CardView.tsx  CardModal.tsx
      AddCardComposer.tsx  AddColumnButton.tsx  PresenceBar.tsx  ShareModal.tsx  BoardMenu.tsx
    pages/
      LandingPage.tsx  SignInPage.tsx  SignUpPage.tsx  ForgotPasswordPage.tsx
      ResetPasswordPage.tsx  BoardsPage.tsx  BoardPage.tsx  InvitePage.tsx
      PublicBoardPage.tsx  SettingsPage.tsx  NotFoundPage.tsx
backend/
  src/utils/email.ts             MODIFY (Task 14 only) — dark branded HTML emails + fix reset link path
```

### Page ↔ route map

| Path | Component | Guard |
|---|---|---|
| `/` | LandingPage | none |
| `/signin`, `/signup` | SignInPage / SignUpPage | redirect to `/boards` if authed |
| `/forgot-password` | ForgotPasswordPage | none |
| `/reset-password/:token` | ResetPasswordPage | none |
| `/boards` | BoardsPage inside AppLayout | requires auth |
| `/boards/:boardId` | BoardPage inside AppLayout | requires auth |
| `/settings` | SettingsPage inside AppLayout | requires auth |
| `/invite/:token` | InvitePage | none (accept/reject require auth → bounce to `/signin`) |
| `/public/:token` | PublicBoardPage | none |
| `*` | NotFoundPage | none |

---

### Task 1: Scaffold, dependencies, theme, types

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/lib/types.ts`

**Interfaces:**
- Produces: `cn(...classes)`, `initials(name)`, `avatarColor(name)`, `formatDate(iso)` from `lib/utils.ts`; all types from `lib/types.ts` (`User`, `Role`, `Board`, `SharedBoard`, `Column`, `Card`, `ColumnWithCards`, `BoardDetail`, `BoardMember`, `PublicLink`, `Invitation`, `InvitePreview`, `PresenceUser`, `ActionType`, `ApiEnvelope`).

- [ ] **Step 1: Install dependencies**

```bash
cd frontend && npm install react-router-dom @tanstack/react-query zustand socket.io-client @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react
```

- [ ] **Step 2: Vite dev proxy** — replace `frontend/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:8080', ws: true },
    },
  },
})
```

- [ ] **Step 3: index.html** — set `<title>Flowline</title>` and add fonts inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Step 4: Design tokens** — replace `frontend/src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #08090a;
  --color-surface: #0f1011;
  --color-surface-2: #141516;
  --color-surface-3: #1a1b1d;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.14);
  --color-text: #f7f8f8;
  --color-text-muted: #8a8f98;
  --color-text-faint: #62666d;
  --color-accent: #5e6ad2;
  --color-accent-hover: #6e78e0;
  --color-danger: #eb5757;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

html {
  color-scheme: dark;
}

body {
  @apply bg-bg text-text font-sans antialiased;
}

::selection {
  background: rgba(94, 106, 210, 0.4);
}

/* thin dark scrollbars */
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb { background: #232427; border-radius: 8px; border: 2px solid #08090a; }
*::-webkit-scrollbar-track { background: transparent; }
```

- [ ] **Step 5: `lib/utils.ts`**

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#5e6ad2", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
```

- [ ] **Step 6: `lib/types.ts`**

```ts
export type Role = "OWNER" | "EDITOR" | "VIEWER";

export interface User { id: string; name: string; email: string }

export interface Board {
  id: string; name: string; description: string | null; ownerId: string;
  createdAt: string; updatedAt: string;
}

export interface SharedBoard extends Board { role: Role; owner: { id: string; name: string } }

export interface Card {
  id: string; title: string; description: string | null; position: number;
  columnId: string; createdById: string; createdAt: string; updatedAt: string;
}

export interface Column {
  id: string; name: string; position: number; boardId: string;
  createdAt: string; updatedAt: string;
}

export interface ColumnWithCards extends Column { cards: Card[] }

export interface PublicLink { id: string; boardId: string; token: string; enabled: boolean }

export interface BoardMember {
  id: string; boardId: string; userId: string; role: Role;
  user: { name: string; email: string }; createdAt: string; updatedAt: string;
}

export interface BoardDetail extends Board {
  columns: ColumnWithCards[];
  publicLink: PublicLink | null;
  members: BoardMember[];
  role: Role; // merged in by the query function from the response's top-level `role`
}

export interface Invitation {
  id: string; boardId: string; email: string; role: Exclude<Role, "OWNER">;
  status: "PENDING" | "ACCEPTED" | "REJECTED"; token: string;
  expiresAt: string | null; createdAt: string;
  board?: Board; sender?: { name: string; email: string };
}

export interface InvitePreview {
  boardName: string; role: Exclude<Role, "OWNER">; status: string;
  expiresAt: string | null; expired: boolean; inviter: { name: string; email: string };
}

export interface PresenceUser { id: string; name: string; isGuest: boolean }

export type ActionType =
  | "editing" | "creating" | "moving"
  | "columnCreating" | "columnEditing" | "columnMoving";

export interface ApiError { status: number; message: string }
```

- [ ] **Step 7: Verify** — `cd frontend && npm run build` passes.

---

### Task 2: API client, auth store, toast store, socket singleton

**Files:**
- Create: `frontend/src/stores/auth.ts`
- Create: `frontend/src/stores/toast.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/socket.ts`

**Interfaces:**
- Produces:
  - `useAuth` zustand hook + `useAuth.getState()` with `{token: string|null, user: User|null, setAuth(token, user), clearAuth()}`
  - `toast.success(msg)`, `toast.error(msg)` helpers + `useToasts` hook (`{toasts: {id, kind, message}[], push, dismiss}`)
  - `api` object with one typed async function per endpoint (list below)
  - `getSocket(): Socket` from `lib/socket.ts`

- [ ] **Step 1: `stores/auth.ts`**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../lib/types";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: "flowline-auth" }
  )
);
```

- [ ] **Step 2: `stores/toast.ts`**

```ts
import { create } from "zustand";

export interface ToastItem { id: number; kind: "success" | "error"; message: string }

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastItem["kind"], message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToasts.getState().push("success", message),
  error: (message: string) => useToasts.getState().push("error", message),
};
```

- [ ] **Step 3: `lib/api.ts`** — the fetch wrapper reads the token imperatively from the auth store, unwraps the envelope, and throws `ApiError`:

```ts
import { useAuth } from "../stores/auth";
import type {
  Board, SharedBoard, BoardDetail, BoardMember, Card, Column,
  Invitation, InvitePreview, User,
} from "./types";

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    if (res.status === 401) useAuth.getState().clearAuth();
    throw new ApiError(res.status, body?.message ?? "Request failed");
  }
  return body as T;
}

const post = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined });
const patch = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(data) });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

type Envelope<T extends object> = { success: boolean; message?: string } & T;

// ---------- auth ----------
export const api = {
  signup: (data: { name: string; email: string; password: string }) =>
    post<Envelope<{ token: string; data: User }>>("/auth/signup", data),
  signin: (data: { email: string; password: string }) =>
    post<Envelope<{ token: string; data: User }>>("/auth/signin", data),
  me: () => request<Envelope<{ data: User }>>("/auth/me"),
  updateMe: (data: { name?: string; email?: string }) =>
    patch<Envelope<{ data: User }>>("/auth/me", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    post<Envelope<{}>>("/auth/change-password", data),
  forgotPassword: (data: { email: string }) => post<Envelope<{}>>("/auth/forgot-password", data),
  resetPassword: (data: { token: string; password: string }) =>
    post<Envelope<{}>>("/auth/reset-password", data),

  // ---------- boards ----------
  createBoard: (data: { name: string; description?: string }) =>
    post<Envelope<{ data: { board: Board; columns: Column[] } }>>("/board", data),
  listBoards: () =>
    request<Envelope<{ boards: Board[]; shared: SharedBoard[] }>>("/board"),
  getBoard: async (boardId: string) => {
    const res = await request<Envelope<{ data: Omit<BoardDetail, "role">; role: BoardDetail["role"] }>>(
      `/board/${boardId}`
    );
    return { ...res.data, role: res.role } as BoardDetail;
  },
  updateBoard: (boardId: string, data: { name?: string; description?: string }) =>
    patch<Envelope<{ updatedBoard: Board }>>(`/board/${boardId}`, data),
  deleteBoard: (boardId: string) => del<Envelope<{ id: string }>>(`/board/${boardId}`),
  listMembers: (boardId: string) =>
    request<Envelope<{ boardMembers: BoardMember[] }>>(`/board/${boardId}/members`),
  updateMemberRole: (boardId: string, userId: string, role: "EDITOR" | "VIEWER") =>
    patch<Envelope<{ updatedMember: BoardMember }>>(`/board/${boardId}/members/${userId}/role`, { role }),
  removeMember: (boardId: string, userId: string) =>
    del<Envelope<{}>>(`/board/${boardId}/members/${userId}`),

  // ---------- columns ----------
  createColumn: (boardId: string, data: { name: string }) =>
    post<Envelope<{ data: { newColumn: Column } }>>(`/column/${boardId}`, data),
  renameColumn: (boardId: string, columnId: string, data: { name: string }) =>
    patch<Envelope<{ updatedColumn: Column }>>(`/column/${boardId}/columns/${columnId}`, data),
  repositionColumns: (boardId: string, columns: { columnId: string; position: number }[]) =>
    patch<Envelope<{ data: Column[] }>>(`/column/${boardId}/position`, { columns }),
  deleteColumn: (boardId: string, columnId: string) =>
    del<Envelope<{ data: Column[] }>>(`/column/${boardId}/columns/${columnId}/delete`),

  // ---------- cards ----------
  createCard: (boardId: string, columnId: string, data: { title: string; description?: string }) =>
    post<Envelope<{ newCard: Card }>>(`/card/${boardId}/columns/${columnId}/cards`, data),
  updateCard: (boardId: string, cardId: string, data: { title?: string; description?: string }) =>
    patch<Envelope<{ updatedCard: Card }>>(`/card/${boardId}/cards/${cardId}`, data),
  moveCard: (
    boardId: string,
    cardId: string,
    data: { newColumnId: string; oldColumnId: string; cards: { cardId: string; position: number }[] }
  ) => patch<Envelope<{}>>(`/card/${boardId}/cards/${cardId}/move`, data),
  deleteCard: (boardId: string, cardId: string) =>
    del<Envelope<{ deletedCardId: string }>>(`/card/${boardId}/card/${cardId}`),

  // ---------- public share ----------
  createPublicLink: (boardId: string) =>
    post<Envelope<{ token: string }>>(`/public/share/${boardId}`),
  getPublicBoard: (token: string) =>
    request<Envelope<{ board: Omit<BoardDetail, "role" | "publicLink" | "members"> }>>(`/public/${token}`),
  togglePublicLink: (boardId: string, enabled: boolean) =>
    patch<Envelope<{ publicBoardLink: { token: string; enabled: boolean } }>>(`/public/toggle-share/${boardId}`, { enabled }),
  deletePublicLink: (boardId: string) => del<Envelope<{}>>(`/public/share/${boardId}/delete`),
  rotatePublicLink: (boardId: string) => post<Envelope<{ token: string }>>(`/public/rotate/${boardId}`),

  // ---------- private share ----------
  sendInvite: (boardId: string, data: { email: string; role: "EDITOR" | "VIEWER" }) =>
    post<Envelope<{ invitation: Invitation }>>(`/private/invite/${boardId}`, data),
  myPendingInvites: () =>
    request<Envelope<{ boardInvitations: Invitation[] }>>("/private/invite/pending"),
  boardPendingInvites: (boardId: string) =>
    request<Envelope<{ pendingInvitations: Invitation[] }>>(`/private/invite/pending/${boardId}`),
  invitePreview: (token: string) =>
    request<Envelope<{ invitation: InvitePreview }>>(`/private/invite/${token}`),
  acceptInvite: (token: string) => post<Envelope<{}>>(`/private/invite/${token}/accept`),
  rejectInvite: (token: string) => post<Envelope<{}>>(`/private/invite/${token}/reject`),
  revokeInvite: (invitationId: string) => del<Envelope<{}>>(`/private/invite/${invitationId}`),
};
```

- [ ] **Step 4: `lib/socket.ts`**

```ts
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../stores/auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      auth: (cb) => cb({ token: useAuth.getState().token ?? undefined }),
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

- [ ] **Step 5: Verify** — `npm run build` passes (files compile even if unused yet; if oxlint/tsc complains about unused vars in other files, ignore — these new files must themselves be clean).

---

### Task 3: UI primitives

**Files:** Create in `frontend/src/components/ui/`: `Button.tsx`, `Input.tsx`, `Textarea.tsx`, `Modal.tsx`, `Dropdown.tsx`, `Tooltip.tsx`, `Avatar.tsx`, `Badge.tsx`, `Spinner.tsx`, `EmptyState.tsx`, `Toaster.tsx`

**Interfaces (exact prop signatures other tasks rely on):**

```ts
// Button.tsx
export function Button(props: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element

// Input.tsx / Textarea.tsx — forwardRef, all native props + optional `label?: string`
export function Input(props: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>): JSX.Element
export function Textarea(props: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element

// Modal.tsx — controlled; renders null when closed; backdrop click + ESC call onClose
export function Modal(props: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }): JSX.Element | null

// Dropdown.tsx — generic anchored menu. Trigger wraps children[0]; menu is children[1].
export function Dropdown(props: { trigger: React.ReactNode; children: React.ReactNode; align?: "left" | "right" }): JSX.Element
export function DropdownItem(props: { onClick?: () => void; danger?: boolean; children: React.ReactNode }): JSX.Element

// Tooltip.tsx
export function Tooltip(props: { label: string; children: React.ReactNode }): JSX.Element

// Avatar.tsx — size px via `size` (default 28); colored initials; guest = dashed border + Ghost icon
export function Avatar(props: { name: string; size?: number; isGuest?: boolean }): JSX.Element

// Badge.tsx — small uppercase label chip
export function Badge(props: { children: React.ReactNode; color?: "accent" | "muted" | "green" | "yellow" }): JSX.Element

// Spinner.tsx
export function Spinner(props: { className?: string }): JSX.Element

// EmptyState.tsx — centered icon + title + subtitle
export function EmptyState(props: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }): JSX.Element

// Toaster.tsx — fixed bottom-right stack reading useToasts()
export function Toaster(): JSX.Element
```

- [ ] **Step 1: Implement each primitive.** Style rules (match Linear):
  - **Button**: base `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none`. Sizes: `sm = h-8 px-3 text-[13px]`, `md = h-9 px-4 text-sm`. Variants: `primary = bg-text text-bg hover:bg-white/90` (white pill — Linear style), `secondary = bg-surface-2 text-text border border-border hover:bg-surface-3`, `ghost = text-text-muted hover:text-text hover:bg-white/5`, `danger = bg-transparent text-danger border border-danger/40 hover:bg-danger/10`. `loading` shows `<Spinner className="size-4"/>` and disables.
  - **Input/Textarea**: `w-full rounded-lg bg-surface-2 border border-border px-3 h-9 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20` (Textarea: `py-2 h-auto min-h-20`). Label: `mb-1.5 block text-[13px] font-medium text-text-muted`.
  - **Modal**: fixed inset-0 z-50; backdrop `bg-black/60 backdrop-blur-sm`; panel `w-full max-w-md` (`max-w-2xl` when `wide`) `rounded-xl border border-border bg-surface shadow-2xl` centered; header row with `title` (text-[15px] font-semibold) + X (lucide `X`) ghost button. Use `useEffect` for ESC listener.
  - **Dropdown**: relative wrapper; click trigger toggles; menu `absolute top-full mt-1 min-w-40 rounded-lg border border-border bg-surface-2 p-1 shadow-xl z-40` (`right-0` when align right); closes on outside mousedown (useEffect on document) and on item click. `DropdownItem`: `flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-text-muted hover:bg-white/5 hover:text-text` (+ `text-danger hover:text-danger` when danger).
  - **Tooltip**: group relative wrapper; label `pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-text opacity-0 transition-opacity group-hover:opacity-100`.
  - **Avatar**: circle with `backgroundColor: avatarColor(name)` at 20% opacity + 1px solid ring of the full color, centered initials text-[11px] font-semibold in the full color; `isGuest` → `border border-dashed border-border text-text-faint` with lucide `Ghost` icon at 60% size.
  - **Badge**: `inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium`; colors: accent=`bg-accent/15 text-accent`, muted=`bg-white/5 text-text-muted`, green=`bg-emerald-500/15 text-emerald-400`, yellow=`bg-amber-500/15 text-amber-400`.
  - **Spinner**: lucide `LoaderCircle` with `animate-spin`.
  - **EmptyState**: `flex flex-col items-center justify-center gap-2 py-16 text-center`; icon in `text-text-faint`, title `text-sm font-medium text-text-muted`, subtitle `text-[13px] text-text-faint`, action below.
  - **Toaster**: `fixed bottom-4 right-4 z-[100] flex flex-col gap-2`; each toast `flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm shadow-xl`; success → lucide `CircleCheck` in emerald-400; error → `CircleAlert` in danger; click dismisses.

- [ ] **Step 2: Verify** — `npm run build`.

---

### Task 4: Router skeleton, guards, app shell

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/app/AppLayout.tsx`
- Create placeholder pages (minimal `export default function XPage() { return null }` — replaced in later tasks): all files under `frontend/src/pages/`

**Interfaces:**
- Produces: `AppLayout` (sidebar nav used by all authed pages), route tree consumed by `main.tsx`.

- [ ] **Step 1: `main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "./components/ui/Toaster.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 2: `App.tsx`** — routes per the Page ↔ route map above. Guards as small components in this file:

```tsx
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/signin" state={{ from: location.pathname + location.search }} replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  if (token) return <Navigate to="/boards" replace />;
  return <>{children}</>;
}
```

Authed pages render as `<RequireAuth><AppLayout><BoardsPage/></AppLayout></RequireAuth>` (wrap each authed page with AppLayout individually — BoardPage needs full-height layout too).

- [ ] **Step 3: `AppLayout.tsx`** — Linear-style shell:
  - Root: `flex h-screen overflow-hidden bg-bg`.
  - Sidebar `w-60 shrink-0 border-r border-border bg-surface flex flex-col`:
    - Top: workspace row `px-4 py-3.5 flex items-center gap-2` — lucide `Layers` in an accent-tinted square + `Flowline` wordmark `text-[15px] font-semibold tracking-tight`, and a chevron (decorative).
    - Nav section: items `Boards` (lucide `LayoutGrid`, → `/boards`), `Settings` (lucide `Settings`, → `/settings`). Item classes: `mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] text-text-muted hover:bg-white/5 hover:text-text`; active (use `NavLink`) → `bg-white/5 text-text`.
    - Spacer, then bottom user row: `<Avatar name={user.name}/>` + name/email (truncate, email `text-xs text-text-faint`) + ghost icon-button `LogOut` (lucide) → `clearAuth(); disconnectSocket(); navigate("/")`.
  - Main: `<main className="flex-1 min-w-0 overflow-y-auto"><Outlet/></main>`.
  - Read user from `useAuth`; if `user` null but token exists, fire `api.me()` in a `useEffect` and `setAuth(token, res.data)` (handles stale persisted state).

- [ ] **Step 4: Verify** — `npm run build` passes; `npm run dev` renders blank pages without console errors.

---

### Task 5: Auth pages

**Files:**
- Create: `frontend/src/pages/SignInPage.tsx`, `SignUpPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- Create: `frontend/src/components/auth/AuthLayout.tsx`

**Interfaces:**
- Consumes: `api.signin/signup/forgotPassword/resetPassword`, `useAuth.setAuth`, `toast`, ui primitives.
- Produces: working auth flows. After signin/signup → `setAuth(token, data)` → navigate to `location.state.from ?? "/boards"`.

- [ ] **Step 1: `AuthLayout`** — centered: `min-h-screen flex items-center justify-center bg-bg px-4` with a subtle radial glow (`absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(94,106,210,0.08),transparent_50%)]`); card `w-full max-w-sm rounded-2xl border border-border bg-surface p-8`; Flowline wordmark + `Layers` icon centered above the card; `children` inside.

- [ ] **Step 2: SignInPage** — heading `Welcome back` (`text-xl font-semibold`) + sub `text-sm text-text-muted`. Email + password Inputs, submit Button (`w-full`, loading state). Error → `toast.error(err.message)`. Footer link: `Don't have an account? Sign up` → `/signup`; above button: `Forgot password?` link → `/forgot-password` (`text-[13px] text-accent hover:text-accent-hover`).

- [ ] **Step 3: SignUpPage** — same shell; fields name/email/password; client-side min-length hints (password ≥ 8); on success same redirect logic.

- [ ] **Step 4: ForgotPasswordPage** — email input; on success replace form with success state: `CircleCheck` icon + "Check your inbox" + `If that email is registered, a reset link has been sent.` + back-to-signin link.

- [ ] **Step 5: ResetPasswordPage** — reads `:token` param; password + confirm inputs (client check match + ≥8); calls `api.resetPassword({token, password})`; on success → toast + navigate `/signin`. Invalid/expired token error → inline error panel with link to `/forgot-password`.

- [ ] **Step 6: Verify** — build passes; manually sign up against running backend.

---

### Task 6: Landing page

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`
- Create: `frontend/src/components/landing/LandingNav.tsx`, `Hero.tsx`, `BoardMockup.tsx`, `Features.tsx`, `Highlight.tsx`, `Footer.tsx`

**Spec (short — 4 sections + footer, per requirement):**

- [ ] **Step 1: `LandingNav`** — fixed top, `backdrop-blur-md bg-bg/70 border-b border-border`; inner `mx-auto max-w-6xl px-6 h-16 flex items-center justify-between`. Left: `Layers` icon + Flowline. Center links (hidden md:flex, `text-sm text-text-muted hover:text-text`): Product, Features, Pricing — all `href="#features"` or `#`. Right: `Log in` ghost → `/signin`; `Sign up` white pill (`rounded-full bg-text px-4 h-9 text-sm font-medium text-bg`) → `/signup`. If authed, right side is single button `Open app` → `/boards`.

- [ ] **Step 2: `Hero`** — `pt-40 pb-24 text-center px-6`. Eyebrow badge: `New · Realtime collaboration →` (`text-[13px] text-text-muted border border-border rounded-full px-3 py-1`). H1: `Plan and build, together in real time` — `text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto`. Sub: `Flowline is a realtime kanban for teams — drag cards, share boards, and see every change as it happens.` (`text-lg text-text-muted max-w-xl mx-auto mt-5`). Buttons row: `Get started` (white pill, → `/signup`) + `Log in` (secondary, → `/signin`). Below: `<BoardMockup/>` in a `mx-auto max-w-4xl` frame.

- [ ] **Step 3: `BoardMockup`** — static pure-markup mini kanban inside `rounded-xl border border-border bg-surface shadow-2xl overflow-hidden` with a glow behind (`absolute -inset-8 bg-accent/10 blur-3xl -z-10`). Top bar: three dots + `Sprint 24` + PresenceBar-like stacked avatars (3 Avatar components). Body: 3 columns (`Design`, `In progress`, `Done`) each with 2–3 static cards (`rounded-lg border border-border bg-surface-2 p-3 text-left text-[13px]`), one card with an accent ring + tiny Avatar bottom-right to suggest live editing. All hardcoded.

- [ ] **Step 4: `Features`** (`id="features"`) — section header: `A new species of board tool.` (`text-3xl font-semibold`) + muted sub-line. 3-col grid (`md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border`, cells `bg-bg p-8`): **Real-time by default** (lucide `Zap`) — "Every move, edit, and comment syncs instantly across every open tab." · **Roles built in** (lucide `ShieldCheck`) — "Owners, editors, and viewers. Invite anyone with exactly the access they need." · **Share with a link** (lucide `Link2`) — "Publish a read-only live view of any board — no account required."

- [ ] **Step 5: `Highlight`** — two-col section (`md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto px-6 py-28`): left heading `Presence you can feel.` + paragraph "See who's online, who's editing which card, and who's dragging what — as it happens. Ephemeral indicators keep fast teams out of each other's way." + `Learn more →` link (decorative). Right: small mockup panel showing 3 avatars + "karri is editing…" chip on a card (hardcoded markup in BoardMockup style).

- [ ] **Step 6: `Footer`** — CTA block above footer: `Built for the future. Available today.` (`text-4xl font-semibold text-center`) + centered `Get started` pill. Footer: `border-t border-border`, `mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8` — columns Product/Company/Resources/Connect with 3–4 dead links each (`text-[13px] text-text-muted hover:text-text`); bottom row `© 2026 Flowline` + Privacy/Terms dead links.

- [ ] **Step 7: `LandingPage`** composes all six. Verify build + visual check at `/`.

---

### Task 7: Dashboard (boards + invitations inbox)

**Files:**
- Create: `frontend/src/pages/BoardsPage.tsx`
- Create: `frontend/src/components/app/CreateBoardModal.tsx`
- Create: `frontend/src/components/app/InvitationsInbox.tsx`

**Interfaces:**
- Consumes: `api.listBoards` (query key `["boards"]`), `api.myPendingInvites` (`["invites"]`), `api.createBoard`, `api.acceptInvite`, `api.rejectInvite`.

- [ ] **Step 1: `BoardsPage`** — `mx-auto max-w-5xl px-8 py-10`.
  - Header row: `Boards` heading (`text-xl font-semibold`) + Button (`secondary`, lucide `Plus`, "New board") opening CreateBoardModal.
  - `<InvitationsInbox/>` renders only when `["invites"]` returns a non-empty list.
  - Section `Your boards`: grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`; each board = Link to `/boards/:id`: `rounded-xl border border-border bg-surface p-5 hover:border-border-strong hover:bg-surface-2 transition-colors` with name `font-medium`, description `text-[13px] text-text-muted line-clamp-2 mt-1`, footer row `formatDate(createdAt)` in `text-xs text-text-faint`.
  - Section `Shared with you` (only if non-empty): same cards + `<Badge color="accent">{role}</Badge>` + `owner.name` in meta row.
  - Loading: 6 skeleton cards (`animate-pulse rounded-xl border border-border bg-surface h-28`). Empty (no boards at all): EmptyState (`LayoutGrid` icon, "No boards yet", "Create your first board to get started", action = New board button).

- [ ] **Step 2: `CreateBoardModal`** — Modal with name Input (required) + description Textarea (optional); submit → `api.createBoard` → `queryClient.invalidateQueries({queryKey:["boards"]})` → toast success → close → navigate to new board (`/boards/${res.data.board.id}`).

- [ ] **Step 3: `InvitationsInbox`** — section `Invitations` (`text-sm font-medium text-text-muted mb-3`); each row: `flex items-center justify-between rounded-xl border border-border bg-surface p-4` — left: sender name + "invited you to" + board name (`font-medium`) + role Badge; right: `Accept` (Button sm primary) + `Decline` (Button sm ghost). Accept → `api.acceptInvite(token)` → invalidate `["invites"]` AND `["boards"]` → toast → navigate to board. Reject → `api.rejectInvite` → invalidate `["invites"]`.

- [ ] **Step 4: Verify** — build; create a board manually; invite a second account to see the inbox row.

---

### Task 8: Board view — rendering & CRUD (no dnd, no sockets yet)

**Files:**
- Create: `frontend/src/pages/BoardPage.tsx`
- Create: `frontend/src/components/board/BoardCanvas.tsx`, `ColumnView.tsx`, `CardView.tsx`, `CardModal.tsx`, `AddCardComposer.tsx`, `AddColumnButton.tsx`

**Interfaces:**
- Consumes: `api.getBoard` (key `["board", boardId]`), card/column mutations, ui primitives.
- Produces: `<BoardCanvas board={BoardDetail-like} readOnly={boolean} onCardClick={(card) => void}/>` — **also used by PublicBoardPage** (Task 12) with a public-board-shaped object; keep its props to just `{ columns: ColumnWithCards[]; readOnly: boolean; boardId: string }` and internal column state. `CardModal` props: `{ boardId, card: Card | null, readOnly, onClose }`.

**BoardCanvas state contract (critical):**
- `const [columns, setColumns] = useState<ColumnWithCards[]>(props.columns)` synced via `useEffect(() => setColumns(props.columns), [props.columns])` guarded by a `draggingRef` (set true on drag start, false on drag end) — Task 9 adds the guard; Task 8 just syncs unconditionally.
- All mutations update the query cache `["board", boardId]` via `queryClient.setQueryData` with the response payload (shapes in API reference) — never refetch the whole board for content ops.

- [ ] **Step 1: `BoardPage`** — `useParams boardId`; `useQuery(["board", boardId], () => api.getBoard(boardId))`; loading → full-page Spinner; error → EmptyState "Board not found". Renders board topbar + `<BoardCanvas>`.
  - Topbar: `flex items-center justify-between border-b border-border px-6 h-14` — left: back chevron (→ `/boards`) + board name (`text-[15px] font-semibold`) + role `<Badge>`; right: `<PresenceBar/>` placeholder div (Task 10 fills it), `Share` Button (sm secondary, lucide `Share2` — **visible only when role === "OWNER"**), `BoardMenu` (Task 11; placeholder `null` for now).
  - Derive `readOnly = board.role === "VIEWER"`.

- [ ] **Step 2: `BoardCanvas`** — `flex h-[calc(100vh-3.5rem)] gap-4 overflow-x-auto p-6 items-start` (when inside AppLayout; accept optional `className`). Renders `columns.map(col => <ColumnView/>)` + `<AddColumnButton/>` (hidden when readOnly). Card click → `onCardClick(card)`.

- [ ] **Step 3: `ColumnView`** — `w-72 shrink-0 rounded-xl border border-border bg-surface flex flex-col max-h-full`.
  - Header `flex items-center justify-between px-3.5 pt-3 pb-2`: name `text-[13px] font-semibold uppercase tracking-wide text-text-muted` + count chip (`text-xs text-text-faint`) + (editor only) Dropdown (`MoreHorizontal` trigger) with `Rename` / `Delete column` (danger).
  - Rename → inline Input replacing the name; Enter/blur commits via `api.renameColumn` → setQueryData merge.
  - Delete → confirm Modal ("Delete column? This deletes all its cards.") → `api.deleteColumn` → setQueryData: remove column (keep each column's `cards` — response has none).
  - Cards list: `flex flex-col gap-2 overflow-y-auto px-2.5 pb-2` rendering `<CardView>`.
  - Footer: `<AddCardComposer columnId={col.id}/>` (hidden when readOnly).

- [ ] **Step 4: `CardView`** — `group rounded-lg border border-border bg-surface-2 p-3 cursor-pointer hover:border-border-strong`; title `text-[13.5px] leading-snug`; if description non-empty show lucide `AlignLeft` `size-3.5 text-text-faint mt-1.5`. (Task 10 adds editing-indicator ring.)

- [ ] **Step 5: `AddCardComposer`** — collapsed: ghost button `+ Add a card` (`w-full text-left px-3 pb-3 pt-1 text-[13px] text-text-muted hover:text-text`). Expanded: Textarea (autofocus, `Enter` submits, `Esc` cancels, `Enter` must not insert newline — `onKeyDown` preventDefault) + row: `Add card` (sm primary) + X ghost. Submit → `api.createCard` → setQueryData: append `res.newCard` to that column's `cards` (dedupe by id). Emits nothing socket-wise (Task 10).

- [ ] **Step 6: `AddColumnButton`** — `w-72 shrink-0`; collapsed ghost dashed button `+ Add column` (`h-10 rounded-xl border border-dashed border-border text-text-muted hover:text-text hover:border-border-strong`); expanded: Input + Add/Cancel → `api.createColumn` → setQueryData append `{...res.data.newColumn, cards: []}`.

- [ ] **Step 7: `CardModal`** — Modal `wide`; title editing = Input styled `text-lg font-semibold bg-transparent border-transparent focus:bg-surface-2` committed on blur/Enter via `api.updateCard`; description = Textarea (`placeholder "Add a description…"`) committed on blur. Footer: `Delete card` danger Button (with inline confirm state "Click again to confirm") → `api.deleteCard` → setQueryData filter → onClose. `readOnly` → all inputs `disabled`, no delete.

- [ ] **Step 8: Verify** — build; full manual CRUD pass against the backend.

---

### Task 9: Drag & drop (dnd-kit)

**Files:**
- Modify: `frontend/src/components/board/BoardCanvas.tsx`, `ColumnView.tsx`, `CardView.tsx`

**Interfaces:**
- Consumes: `api.moveCard`, `api.repositionColumns`. Keeps Task 8's state contract, adds `draggingRef` guard around the props→state sync effect.

- [ ] **Step 1: Structure.** In `BoardCanvas`:
  - `<DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart onDragOver onDragEnd onDragCancel>` wrapping a horizontal `<SortableContext items={columns.map(c=>c.id)} strategy={horizontalListSortingStrategy}>` of columns, plus `<DragOverlay>` rendering a rotated semi-transparent copy of the active card/column.
  - `sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))`.
  - Disable everything when `readOnly` (render children without DndContext).
  - Each `ColumnView` uses `useSortable({ id: col.id, data: { type: "column" } })` — drag handle = column header.
  - Each `CardView` uses `useSortable({ id: card.id, data: { type: "card", columnId } })`; each column's card list is a vertical `<SortableContext items={cards.map(c=>c.id)} strategy={verticalListSortingStrategy}>`; the column body also gets `useDroppable` via the sortable hook's node (empty columns stay droppable because the column itself is a droppable sortable node — use `useDroppable({ id: col.id + "-droppable", data: { type: "column-body", columnId: col.id } })` on the cards container if needed).

- [ ] **Step 2: onDragOver (cards across columns only).** When active is a card and `over` is a card in another column or a column-body: `setColumns` — remove card from source column, insert into destination at `over` index (pure local state; no API). Guard `draggingRef.current = true` on dragStart.

- [ ] **Step 3: onDragEnd — card within same column.** Compute `reordered = arrayMove(col.cards, oldIndex, newIndex)`; `setColumns` locally; then:

```ts
await api.moveCard(boardId, activeCardId, {
  newColumnId: col.id,
  oldColumnId: col.id,
  cards: reordered.map((c, i) => ({ cardId: c.id, position: i + 1 })),
});
```

On success write the same `reordered` array into the `["board", boardId]` cache for that column. On error → `toast.error`, revert by re-syncing from cache (`setColumns(queryClient.getQueryData(["board", boardId]).columns)`).

- [ ] **Step 4: onDragEnd — card across columns.** Local state already updated by onDragOver; final index from `over`. Then:

```ts
const dest = columnsAfterDrag.find((c) => c.id === newColumnId)!;
await api.moveCard(boardId, activeCardId, {
  newColumnId,
  oldColumnId, // captured at dragStart from active.data.current.columnId
  cards: dest.cards.map((c, i) => ({ cardId: c.id, position: i + 1 })), // dest.cards ALREADY includes the moved card
});
```

Write both affected columns (moved card gets `columnId: newColumnId`) into cache. Error → toast + revert from cache.

- [ ] **Step 5: onDragEnd — column drag.** `arrayMove(columns, oldIndex, newIndex)` locally; then:

```ts
await api.repositionColumns(boardId, reordered.map((c, i) => ({ columnId: c.id, position: i + 1 })));
```

Cache: write reordered array. Error → toast + revert.

- [ ] **Step 6: `draggingRef` guard** — `onDragStart: draggingRef.current = true`; `onDragEnd/onDragCancel: draggingRef.current = false`; sync effect: `useEffect(() => { if (!draggingRef.current) setColumns(props.columns) }, [props.columns])`.

- [ ] **Step 7: Verify** — build; drag cards within/across columns and whole columns; reload page → order persisted; check with a second browser tab that both converge (socket events arrive — idempotent handlers land in Task 10).

---

### Task 10: Realtime — socket hook, presence bar, ephemeral indicators

**Files:**
- Create: `frontend/src/stores/presence.ts`
- Create: `frontend/src/hooks/useBoardSocket.ts`
- Create: `frontend/src/components/board/PresenceBar.tsx`
- Modify: `frontend/src/pages/BoardPage.tsx` (call hook, render PresenceBar)
- Modify: `CardView.tsx`, `ColumnView.tsx`, `AddCardComposer.tsx`, `CardModal.tsx` (emit + render ephemeral indicators)

**Interfaces:**
- Produces:
  - `usePresence` zustand: `{ users: PresenceUser[]; activity: Record<string, { user: PresenceUser; type: ActionType }>; setPresence(users); setActivity(targetId, user, type); clearActivity(targetId, type); reset() }`
  - `useBoardSocket(boardId: string, publicToken?: string, queryKey: unknown[])` — call once per board page.

- [ ] **Step 1: `stores/presence.ts`**

```ts
import { create } from "zustand";
import type { ActionType, PresenceUser } from "../lib/types";

interface PresenceState {
  users: PresenceUser[];
  activity: Record<string, { user: PresenceUser; type: ActionType }>;
  setPresence: (users: PresenceUser[]) => void;
  setActivity: (targetId: string, user: PresenceUser, type: ActionType) => void;
  clearActivity: (targetId: string, type: ActionType) => void;
  reset: () => void;
}

export const usePresence = create<PresenceState>((set) => ({
  users: [],
  activity: {},
  setPresence: (users) => set({ users }),
  setActivity: (targetId, user, type) =>
    set((s) => ({ activity: { ...s.activity, [`${type}:${targetId}`]: { user, type } } })),
  clearActivity: (targetId, type) =>
    set((s) => {
      const next = { ...s.activity };
      delete next[`${type}:${targetId}`];
      return { activity: next };
    }),
  reset: () => set({ users: [], activity: {} }),
}));
```

- [ ] **Step 2: `useBoardSocket.ts`** — the core of realtime. Signature: `useBoardSocket(boardId: string, publicToken: string | undefined, queryKey: unknown[])`. On mount: `const socket = getSocket(); socket.emit("board:join", { boardId, publicToken })`. On unmount: `socket.emit("board:leave", { boardId }); socket.off(); usePresence.getState().reset();`. All cache updaters are generic over any cached object with a `columns: ColumnWithCards[]` field (works for both `["board", id]` and `["publicBoard", token]` caches):

```ts
const qc = useQueryClient();
const updateColumns = (fn: (cols: ColumnWithCards[]) => ColumnWithCards[]) =>
  qc.setQueryData<any>(queryKey, (old) => (old ? { ...old, columns: fn(old.columns) } : old));

useEffect(() => {
  const socket = getSocket();
  socket.emit("board:join", { boardId, publicToken });

  socket.on("presence:update", (p: { count: number; users: PresenceUser[] }) =>
    usePresence.getState().setPresence(p.users)
  );

  socket.on("card:created", (card: Card) =>
    updateColumns((cols) =>
      cols.map((c) =>
        c.id === card.columnId && !c.cards.some((k) => k.id === card.id)
          ? { ...c, cards: [...c.cards, card] }
          : c
      )
    )
  );
  socket.on("card:updated", (card: Card) =>
    updateColumns((cols) =>
      cols.map((c) => ({ ...c, cards: c.cards.map((k) => (k.id === card.id ? card : k)) }))
    )
  );
  socket.on("card:moved", (p: { oldColumn: { columnId: string; cards: Card[] }; newColumn: { columnId: string; cards: Card[] } }) =>
    updateColumns((cols) =>
      cols.map((c) =>
        c.id === p.oldColumn.columnId ? { ...c, cards: p.oldColumn.cards }
        : c.id === p.newColumn.columnId ? { ...c, cards: p.newColumn.cards }
        : c
      )
    )
  );
  socket.on("card:deleted", (p: { cardId: string }) =>
    updateColumns((cols) => cols.map((c) => ({ ...c, cards: c.cards.filter((k) => k.id !== p.cardId) })))
  );

  socket.on("column:created", (p: { newColumn: Column }) =>
    updateColumns((cols) =>
      cols.some((c) => c.id === p.newColumn.id) ? cols : [...cols, { ...p.newColumn, cards: [] }]
    )
  );
  socket.on("column:updated", (p: { updatedColumn: Column }) =>
    updateColumns((cols) => cols.map((c) => (c.id === p.updatedColumn.id ? { ...c, name: p.updatedColumn.name } : c)))
  );
  socket.on("column:moved", (p: { updatedColumns: Column[] }) =>
    updateColumns((cols) => {
      const pos = new Map(p.updatedColumns.map((c) => [c.id, c.position]));
      return [...cols].sort((a, b) => (pos.get(a.id) ?? a.position) - (pos.get(b.id) ?? b.position));
    })
  );
  socket.on("column:deleted", (p: { columnIdDeleted: string }) =>
    updateColumns((cols) => cols.filter((c) => c.id !== p.columnIdDeleted))
  );

  socket.on("board:updated", (p: { updatedBoard: Board }) =>
    qc.setQueryData<any>(queryKey, (old) => (old ? { ...old, name: p.updatedBoard.name, description: p.updatedBoard.description } : old))
  );

  socket.on("member:added", () => qc.invalidateQueries({ queryKey })); // refetch detail (members list)
  socket.on("member:updated", () => qc.invalidateQueries({ queryKey }));
  socket.on("member:removed", () => qc.invalidateQueries({ queryKey }));

  const gone = (msg: string) => {
    toast.error(msg);
    usePresence.getState().reset();
    window.location.href = publicToken ? "/" : "/boards";
  };
  socket.on("board:deleted", () => gone("This board was deleted"));
  socket.on("board:kicked", () => gone("You were removed from this board"));
  socket.on("board:revoked", () => gone("Public access to this board was revoked"));
  socket.on("board:error", (p: { message?: string }) => p.message && toast.error(p.message));

  const types: ActionType[] = ["editing", "creating", "moving", "columnCreating", "columnEditing", "columnMoving"];
  for (const t of types) {
    socket.on(`user:${t}`, (p: { user: PresenceUser; targetId: string }) =>
      usePresence.getState().setActivity(p.targetId, p.user, t)
    );
    socket.on(`user:${t}:stop`, (p: { user: PresenceUser; targetId: string }) =>
      usePresence.getState().clearActivity(p.targetId, t)
    );
  }

  return () => {
    socket.emit("board:leave", { boardId });
    socket.off(); // remove every listener registered on this shared socket
    usePresence.getState().reset();
  };
}, [boardId, publicToken, qc]);
```

- [ ] **Step 3: `PresenceBar`** — reads `usePresence().users`; renders `-space-x-2 flex` of `<Avatar>` (max 5) + overflow chip `+N` (`size-7 rounded-full bg-surface-3 text-xs text-text-muted flex items-center justify-center border border-border`), each wrapped in Tooltip with the name; right side `text-xs text-text-faint` = `{users.length} online`. Renders `null` when `users.length === 0`.

- [ ] **Step 4: Ephemeral indicators (render side):**
  - `CardView`: read `activity` from `usePresence`; if `activity["editing:${card.id}"]` or `["moving:..."]` exists → add `ring-1` in the editing user's `avatarColor` + tiny `<Avatar size={18}>` absolutely positioned `-top-1.5 -right-1.5` with Tooltip `"${name} is editing"`.
  - `ColumnView` header: `activity["columnEditing:${col.id}"]`/`["columnMoving:..."]` → same ring on the header.
  - `AddCardComposer` area (column footer): `activity["creating:${col.id}"]` → show `<p className="px-3 pb-2 text-xs text-text-faint italic">{user.name} is adding a card…</p>`; `activity["columnCreating:${boardId}"]` → right of the columns list show a ghost column skeleton with "{name} is adding a column…".

- [ ] **Step 5: Ephemeral indicators (emit side)** — editor role only:
  - `CardModal` open → `getSocket().emit("card:editing", { boardId, cardId })`; close → `emit("action:stop", { boardId })`.
  - `AddCardComposer` expand → `emit("card:creating", { boardId, columnId })`; collapse/submit → `emit("action:stop", { boardId })`.
  - Column rename input focus → `emit("column:editing", { boardId, columnId })`; blur → `action:stop`.
  - `AddColumnButton` expand → `emit("column:creating", { boardId })`; collapse → `action:stop`.
  - `BoardCanvas` `onDragStart` → card: `emit("card:moving", { boardId, cardId: active.id })`, column: `emit("column:moving", { boardId, columnId: active.id })`; `onDragEnd/onDragCancel` → `action:stop`.

- [ ] **Step 6: BoardPage wiring** — call `useBoardSocket(boardId, undefined, ["board", boardId])`; render `<PresenceBar/>` in the topbar.

- [ ] **Step 7: Verify** — build; open same board in two browsers (two accounts): edits/moves sync live, presence avatars appear, editing rings show.

---

### Task 11: Share modal, board menu, role gating polish

**Files:**
- Create: `frontend/src/components/board/ShareModal.tsx`, `BoardMenu.tsx`
- Modify: `frontend/src/pages/BoardPage.tsx`

**Interfaces:**
- Consumes: members/invite/public-link endpoints; `["board", boardId]` cache (has `members`, `publicLink`, `ownerId`, `role`).

- [ ] **Step 1: `ShareModal`** — props `{ board: BoardDetail; open; onClose }`. Modal `wide` with internal tabs (`Members` | `Invite` | `Public link`) — tab bar `flex gap-1 border-b border-border mb-4`, tab button `px-3 pb-2 text-[13px] font-medium text-text-muted border-b-2 border-transparent -mb-px` active → `text-text border-accent`.
  - **Members tab:** owner row first — Avatar + (owner name: current user's name when `board.ownerId === user.id`, else look up `["boards"]` cache `shared` entry's `owner.name`, else "Board owner") + `<Badge color="yellow">Owner</Badge>`. Then `board.members.map(m)`: Avatar + name/email + role `<Dropdown>` (options EDITOR/VIEWER, current highlighted) + `Remove` DropdownItem (danger). Role change → `api.updateMemberRole` → invalidate `["board", boardId]` → toast. Remove → `api.removeMember` → invalidate → toast. Below: `Pending invitations` (query `["boardInvites", boardId]` → `api.boardPendingInvites`) each row email + role Badge + ghost `X` button → `api.revokeInvite` → invalidate.
  - **Invite tab:** email Input + role Dropdown (EDITOR/VIEWER, default EDITOR) + `Send invite` Button → `api.sendInvite` → toast success → invalidate `["boardInvites", boardId]`. Error (409 already pending etc.) → `toast.error(err.message)`.
  - **Public link tab:** if `!board.publicLink` → EmptyState (`Link2`, "No public link", "Anyone with the link gets a live read-only view", action Button "Create link" → `api.createPublicLink` → invalidate `["board", boardId]`). Else: URL row — read-only Input value `${window.location.origin}/public/${board.publicLink.token}` + `Copy` Button (`navigator.clipboard.writeText` + toast "Copied"); toggle row "Link enabled" + switch button (`w-9 h-5 rounded-full transition-colors`, `bg-accent` when enabled else `bg-surface-3`, knob translates) → `api.togglePublicLink` → invalidate; footer buttons: `Rotate link` (secondary; confirm via double-click state) → `api.rotatePublicLink` → invalidate; `Delete link` (danger) → `api.deletePublicLink` → invalidate. All public-link mutations invalidate `["board", boardId]` so `publicLink` refreshes.

- [ ] **Step 2: `BoardMenu`** — owner only. Dropdown (`MoreHorizontal` ghost icon button): `Rename board` → Modal with name + description Inputs prefilled → `api.updateBoard` → setQueryData merge → toast; `Delete board` (danger) → confirm Modal ("Delete this board? This cannot be undone.") → `api.deleteBoard` → invalidate `["boards"]` → navigate `/boards`.

- [ ] **Step 3: BoardPage wiring** — `Share` button opens `<ShareModal>`; render `<BoardMenu>`; both owner-only. VIEWER sees neither; EDITOR sees neither (owner-only per backend).

- [ ] **Step 4: Role gating sweep** — verify: VIEWER → no composers, no add-column, no card modal editing, no dnd (Task 9), no share/menu buttons. EDITOR → full content editing, no share/menu. OWNER → everything.

- [ ] **Step 5: Verify** — build; with a 3-account setup (owner/editor/viewer) check every gated element.

---

### Task 12: Invite page + public board page

**Files:**
- Create: `frontend/src/pages/InvitePage.tsx`, `PublicBoardPage.tsx`

- [ ] **Step 1: `InvitePage`** (`/invite/:token`) — centered AuthLayout-style card. Query `api.invitePreview(token)` (no auth needed). Shows: inviter name + "invited you to" + **boardName** + role Badge + (if `expired` → error panel "This invitation has expired"). Buttons: `Accept` (primary) + `Decline` (ghost). If `!token in auth store` → both buttons route to `/signin` with `state={{ from: `/invite/${token}` }}` and a hint "Sign in to respond to this invitation". Accept → `api.acceptInvite` → invalidate `["boards"]` + `["invites"]` → navigate to `/boards/${preview...}` — the accept response has no board id in preview, so just navigate `/boards` and toast "Invitation accepted". Reject → `api.rejectInvite` → navigate `/boards` (or `/` if not authed after sign-in flow — keep: if authed → `/boards`, else `/`). Already-accepted/rejected error → inline message.

- [ ] **Step 2: `PublicBoardPage`** (`/public/:token`) — no AppLayout. Topbar mimics BoardPage: Flowline wordmark (→ `/`) + board name + `<Badge color="green">Live</Badge>` + `<Badge color="muted">Read-only</Badge>`; right: `<PresenceBar/>`. Query: `useQuery(["publicBoard", token], () => api.getPublicBoard(token).then(r => r.board))`. Call `useBoardSocket(board.id, token, ["publicBoard", token])` — board id comes from the query, so render a child component `<PublicBoardInner board={board}/>` after load and call the hook there. Body: `<BoardCanvas columns={board.columns} boardId={board.id} readOnly/>`. 404 → full-page EmptyState ("Link unavailable", "This link is invalid or has been disabled"). If authed user opens it, show an additional banner button "Open app" → `/boards` (nice-to-have).

- [ ] **Step 3: Verify** — build; create public link, open in incognito: live read-only updates flow through, guest appears in presence, disabling link kicks the incognito session (`board:revoked` → redirect to `/`).

---

### Task 13: Settings page

**Files:**
- Create: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Layout** — `mx-auto max-w-2xl px-8 py-10`; heading `Settings`.
  - **Profile section** (`rounded-xl border border-border bg-surface p-6 mb-6`, heading `text-sm font-semibold mb-4`): name + email Inputs prefilled from `useAuth.user`; `Save changes` → `api.updateMe` → `setAuth(token, res.data)` (keep same token) → toast. 409 email-taken → toast.error.
  - **Password section** (same card style): current + new + confirm Inputs (type password) → validate match + ≥8 → `api.changePassword` → toast "Password updated" → clear fields; 401 → toast.error("Current password is incorrect").

- [ ] **Step 2: Verify** — build; update name (check sidebar reflects it), change password, sign in with new password.

---

### Task 14: Backend email redesign

**Files:**
- Modify: `backend/src/utils/email.ts`

**Interfaces:**
- Consumes/Produces: same exported function signatures (`sendInviteEmail`, `sendForgotPasswordEmail`) — no route changes. **Also fixes the reset link path** from `/forgot-password/${token}` to `/reset-password/${token}` (matches Task 5 route).

- [ ] **Step 1: Rewrite both templates** as dark, branded, email-client-safe HTML (table layout, all inline styles, no external assets). Shared wrapper:

```
Outer table: width 100%, background #08090a, padding 40px 16px
  Inner table: max-width 480px, background #0f1011, border 1px solid rgba(255,255,255,0.08), border-radius 16px, padding 32px
    Brand row: "Flowline" in #f7f8f8 600 18px Inter/Arial
    Heading: #f7f8f8, 20px, 600
    Body copy: #8a8f98, 14px, line-height 1.6
    CTA button (table-based bulletproof): background #5e6ad2, color #ffffff, padding 12px 24px, border-radius 8px, 14px 600
    Fallback link block: "Or paste this link into your browser:" + URL in #5e6ad2, 13px, word-break break-all
    Footer: #62666d, 12px — "You received this email because ... · Flowline"
```

- Invite email subject stays `` `You've been invited to "${boardName}"` ``; body: "{senderName} invited you to collaborate on **{boardName}**" + role mention (`as an editor/viewer`) + "View invitation" CTA → `${FRONTEND_URL}/invite/${token}` + expiry note (7 days). Keep `textContent` equivalent.
- Forgot email: heading "Reset your password", copy "We received a request to reset the password for your Flowline account. This link expires in 2 hours." + CTA "Reset password" → `${FRONTEND_URL}/reset-password/${token}` + "If you didn't request this, you can safely ignore this email." Fix `textContent` to include the URL.

- [ ] **Step 2: Verify** — `cd backend && npm run build` passes; trigger `POST /api/auth/forgot-password` for a real account and inspect the received email; send an invite and inspect.

---

### Task 15: Final verification

- [ ] **Step 1:** `cd frontend && npm run build && npm run lint` — clean.
- [ ] **Step 2:** `cd backend && npm run build` — clean.
- [ ] **Step 3:** Full manual pass with backend running (`npm run dev` in backend, `npm run dev` in frontend):
  1. Signup A → create board → add columns/cards → drag both.
  2. Signup B (incognito) → A invites B as EDITOR → B accepts from dashboard inbox → B edits card → A sees it live + presence shows 2.
  3. A creates public link → incognito-no-auth opens `/public/<token>` → sees live view → A disables link → guest gets kicked.
  4. A demotes B to VIEWER → B's UI becomes read-only live (member:updated invalidates board → role refetched).
  5. Forgot password → reset via email link → signin with new password.
  6. Settings: rename profile, change password.
- [ ] **Step 4:** Commit.

---

## Self-Review Notes (checked)

- **Spec coverage:** every REST endpoint and every socket event in the API reference has exactly one consuming task; landing page = 4 sections + footer; emails covered in Task 14.
- **Known backend quirks encoded:** move/reposition endpoints require full ordered arrays (Tasks 9.3–9.5); `column:moved`/`column:deleted` payloads carry cardless columns — updaters only read positions (Task 10.2); delete-card path is singular `/card/` (Task 2.3); `column:created` needs `cards: []` added (Task 10.2); broadcasts echo to the sender — create handlers dedupe by id (Task 10.2); forgot-password email originally pointed at the wrong frontend route (Task 14).
- **Type consistency:** `ColumnWithCards`, `BoardDetail`, `PresenceUser`, `ActionType`, `useBoardSocket(boardId, publicToken, queryKey)`, `BoardCanvas({columns, boardId, readOnly})` used identically across tasks.
