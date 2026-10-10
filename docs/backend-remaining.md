# Backend — Remaining Work & Known Issues

> Scope: kanban board with columns/cards, reposition/edit, private sharing with roles,
> and anonymous read-only public sharing. This doc lists what is already done, what is
> left (routes + functionality), and what is broken in the existing code. No code — plan only.

## Decisions (locked)

1. **Invitations**: explicit accept via email link (not auto-join on signup).
2. **Anonymous access**: public board gets a realtime **read-only** socket connection.
3. **Password reset**: in scope. **Account deletion**: out of scope (documented only).
4. **Membership management**: owner-only (no member self-leave, no transfer ownership for now).
5. **URL patterns**: keep existing patterns as-is; new routes follow the same style.

---

## 1. What already exists

**Auth** (`src/routes/auth.route.ts`)
- `POST /api/auth/signup` — hashes password, returns JWT, links pending invitations by email to new `receiverId`.
- `POST /api/auth/signin`.

**Board** (`src/routes/board.route.ts`) — all `verifyToken`
- `POST /api/board/` — creates board + default columns (To Do / In Progress / Done).
- `GET /api/board/` — owned boards + shared boards (memberships, with `role`).
- `GET /api/board/:boardId` — board + columns + cards (min `VIEWER`).
- `PATCH /api/board/:boardId` (`OWNER`).
- `DELETE /api/board/:boardId` (`OWNER`).

**Column** (`src/routes/column.route.ts`) — all `verifyToken`
- `POST /api/column/:boardId` (`EDITOR`).
- `PATCH /api/column/:boardId/columns/:columnId` — rename (`EDITOR`).
- `PATCH /api/column/:boardId/position` — reorder (`EDITOR`).
- `DELETE /api/column/:boardId/columns/:columnId/delete` (`EDITOR`).

**Card** (`src/routes/card.route.ts`) — all `verifyToken`
- `POST /api/card/:boardId/columns/:columnId/cards` (`EDITOR`).
- `PATCH /api/card/:boardId/cards/:cardId` — edit (`EDITOR`).
- `PATCH /api/card/:boardId/cards/:cardId/move` — reorder / re-column (`EDITOR`).
- `DELETE /api/card/:boardId/card/:cardId` (`EDITOR`).

**Public sharing** (`src/routes/publicshare.route.ts`)
- `GET /api/public/share/:boardId` (`OWNER`) — get-or-create public token.
- `GET /api/public/:token` — public read-only board fetch (no auth).
- `PATCH /api/public/toggle-share/:boardId` (`OWNER`) — enable/disable.

**Private sharing** (`src/routes/privateshare.routes.ts`)
- `POST /api/private/invite/:boardId` (`OWNER`) — creates invitation + sends Brevo email.

**Realtime** (`src/socket/index.ts`, `src/socket/presence.ts`)
- JWT-or-guest socket auth; `board:join` / `board:leave`; `presence:update`.
- Ephemeral `user:creating` / `user:editing` / `user:moving` (+ `:stop`).
- REST column/card mutations emit `column:*` and `card:*` events.

**Middleware / infra**: `verifyToken`, `requireBoardRole` (rank `VIEWER < EDITOR < OWNER`),
Prisma schema + one migration.

---

## 2. Remaining routes — Auth

- `GET /api/auth/me` — current user profile (frontend will need this).
- `PATCH /api/auth/me` — update `name` / `email`.
- `POST /api/auth/change-password` — current password + new password.
- `POST /api/auth/forgot-password` — issue reset token, email it (reuse `src/utils/email.ts`).
- `POST /api/auth/reset-password` — consume token, set new password.
- `POST /api/auth/signout` — only needed if refresh tokens / denylist are added; current
  7-day JWT has no revocation, so this is optional and can be skipped in v1.

**Account deletion: NOT in scope.** Document as future work — note that deleting a `User`
currently fails because `Card.createdById` and `BoardInvitation.senderId` use
`ON DELETE RESTRICT`. A future implementation must reassign or cascade those.

---

## 3. Remaining routes — Board & membership (owner-only management)

- `GET /api/board/:boardId/members` — list members + roles (needed for any sharing UI).
- `PATCH /api/board/:boardId/members/:userId/role` (`OWNER`) — change member role
  between `EDITOR` and `VIEWER` (forbid assigning `OWNER`).
- `DELETE /api/board/:boardId/members/:userId/delete` (`OWNER`) — remove member.
- `GET /api/board/:boardId` should also return `members`, `publicLink` status, and the
  caller's `role` (currently only returns `role`).

**Not in scope:** member self-leave, transfer ownership (owner-only management).

**Realtime gap:** `PATCH` / `DELETE` board do **not** emit socket events (columns/cards do).
Decide whether clients need `board:updated` / `board:deleted`.

---

## 4. Remaining routes — Private sharing (biggest gap)

The invite flow is **half-built**: the invitation row is created and emailed, but there is
**no endpoint to accept it**, so invited users never become `BoardMember`s. Signup only
backfills `receiverId`. Decision: explicit accept via the email link.

- `GET /api/private/invitations/:token` — preview board name / role / inviter / expiry
  before accepting; must work whether or not the visitor is logged in.
- `POST /api/private/invitations/:token/accept` — auth required. Validate token, reject if
  expired or already used, create `BoardMember`, set invitation status `ACCEPTED`.
- `POST /api/private/invitations/:token/reject` — set status `REJECTED`.
- `GET /api/private/invitations` — pending invitations received by the logged-in user.
- `GET /api/private/invitations/sent/:boardId` (`OWNER`) — pending invites for a board (UI management).
- `DELETE /api/private/invitations/:invitationId/delete` (`OWNER`) — revoke / cancel.
- Enforce `expiresAt` on accept (currently stored but never checked).
- Prevent duplicate pending invites (no unique constraint on board + email + pending).

**Accept flow details**
- If the invited email already belongs to a user, they accept while logged in as that user.
- If not yet a user, the email link leads to signup; after signup they accept the token.
- On accept, create the `BoardMember` with the invitation's `role`; skip if already a member.

---

## 5. Remaining — Public sharing / anonymous read-only

- Anonymous viewers should join the board's realtime room **read-only**:
  - Add a token-based socket path: client presents the public token on `board:join`
    (or a dedicated `public:join` event) and is granted viewer access only if the
    `PublicBoardLink.enabled` is true.
  - Read-only clients must not be able to trigger mutation events.
- `DELETE /api/public/share/:boardId/delete` (`OWNER`) — delete the link (only enable/disable exists).
- `POST /api/public/rotate/:boardId` (`OWNER`) — regenerate token (security).
- Optional: link expiry (not required now).

---

## 6. Remaining — Realtime / socket

- **`board:join` has no authorization.** Any guest or logged-in user can join any `boardId`
  and receive all column/card/move/presence events for **private** boards. Must verify
  membership via `getBoardRole`, or accept a valid enabled public token for read-only.
- `board:join` doesn't validate the board exists; unknown rooms are silently created.
- Presence only emits a **count**; `getBoardUsers` is exported but unused. Emit the user list
  so the UI can render who is online.
- Public/anonymous clients need a distinct read-only flag so broadcasts know they can't mutate.
- Ephemeral "someone is acting" events cover cards only; column/board indicators are optional.
- No payload validation (zod) on socket events; no rejoin / duplicate-join handling.

---

## 7. Remaining — Infrastructure / quality

- Global error handler + JSON 404 handler (no centralized error shape today).
- Rate limiting (especially `/api/auth/*` and public token lookups).
- `helmet`; lock CORS (`origin: "*"` today on both Express and Socket.IO) to `FRONTEND_URL`.
- Request logging (morgan / pino) and startup env validation (fail fast if `JWT_SECRET`,
  `DATABASE_URL`, `BREVO_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`, `FRONTEND_URL` missing).
- Add `.env.example`.
- Tests: none exist; `package.json` `test` script is the default error stub.
- Seed script: none.
- Backend API docs / README: none.
- Health check that pings the DB (`/health`).

---

## 8. Broken / buggy in existing code

1. **`publicshare.route.ts:154`** — `toggle-share` returns **404 on success**
   (`success: true` with status 404). Should be 200.
2. **`privateshare.routes.ts:26`** — validation failure returns **404**, should be 400.
3. **Socket authorization hole** — `board:join` is unrestricted; private boards leak to
   any connected socket (see §6).
4. **Invite flow incomplete** — no accept route, so invited users never join (see §4).
5. **Build / start scripts broken** — `tsconfig.json` sets `noEmit: true`, so `npm run build`
   emits nothing; `start` runs `node dist/app.js` but the entry is `server.ts` →
   `dist/server.js`. Production start cannot work as-is.
6. **Cascade vs RESTRICT mismatch** — `User` deletion fails because `Card.createdById`
   and `BoardInvitation.senderId` are `ON DELETE RESTRICT` (relevant to future account deletion).
7. **Card move across columns doesn't re-normalize the old column's positions**
   (`card.route.ts` move branch) → position gaps / drift.
8. **Client-supplied `position` is trusted** on column/card create and reorder, with no
   server-side normalization → possible duplicate/gap positions (index is non-unique).
9. **Board routes emit no socket events** on update/delete, unlike column/card routes.
10. **`BoardMember.role` enum allows `OWNER`** — role-update route must forbid assigning
    `OWNER` (use transfer-ownership instead; not in scope now).
11. **Semantics** — `GET /api/public/share/:boardId` creates a resource; should be POST.
12. **Inconsistent delete paths** — column uses `/columns/:columnId/delete`, card uses
    `/card/:cardId` (plural/singular + `/delete` suffix inconsistent). Keeping existing
    patterns per decision; new routes follow the same style.
13. **Cosmetic** — signup `name` min length 5 is restrictive; typos in messages
    ("Interval server error", "Sucessfully").

---

## 9. Schema considerations

- `BoardInvitation` has no unique constraint to block duplicate pendings; `expiresAt` is unused.
- `PublicBoardLink` has no expiry / rotation history.
- No assignee / labels / due dates — out of scope (cards only have `createdBy`).
- `Board` / `Column` / `Card` have no secondary sort key; fine given positions.

---

## 10. Suggested build order

1. Fix the concrete bugs (§8 items 1, 2, 5).
2. Auth completion: `me`, update profile, change password, forgot/reset (§2).
3. Private sharing accept / reject / list / revoke + expiry + duplicate guard (§4).
4. Board members list + owner-only role change / remove (§3).
5. Socket authorization + read-only public realtime join + presence list (§5, §6).
6. Public link delete / rotate (§5).
7. Infra hardening: error handler, CORS lock, helmet, rate limit, env validation, health (§7).
8. Tests, seed, `.env.example`, docs (§7).
