# Flowline

A realtime collaborative kanban board. Drag cards and columns, see who's online and what they're editing live, share boards with members or public read-only links, and get email invites/password resets.

## Tech stack

| Layer      | Tools |
|------------|-------|
| Frontend   | React 19, Vite, Tailwind CSS 4, TanStack Query, Zustand, socket.io-client, dnd-kit |
| Backend    | Node.js, Express 5, Socket.IO, Prisma 7 (PostgreSQL), JWT auth, Brevo email |

## Structure

```
kanban-board-websocket/
├── frontend/          # React SPA
│   └── src/
│       ├── pages/     # Landing, auth, boards, public board, settings
│       ├── components/
│       │   ├── board/ # Board canvas, columns, cards, presence, activity
│       │   └── app/   # App shell, invitations, command palette
│       ├── stores/    # Zustand: auth, presence, activity log, toast
│       ├── hooks/     # useBoardSocket: socket event wiring
│       └── lib/       # api client, socket client, board cache, types
└── backend/
    └── src/
        ├── server.ts  # HTTP server + Socket.IO on the same port
        ├── app.ts     # Express app, CORS, helmet, rate limits, /health
        ├── routes/    # auth, board, column, card, public share, private invite
        ├── socket/    # board rooms, presence, live action broadcasts
        ├── middleware/# JWT verify, board access/role checks
        ├── lib/       # prisma client (pg adapter), email (Brevo)
        └── prisma/    # schema + migrations
```

### How it works

1. **Auth** — signup/signin issues a JWT (7-day expiry). The frontend stores it via Zustand persist and sends it as a Bearer token; the same token authenticates the Socket.IO handshake.
2. **Boards** — a board has columns, cards, and members with roles: `OWNER`, `EDITOR`, `VIEWER`. Role checks happen in backend middleware on every route.
3. **Realtime** — every board is a Socket.IO room. Connected clients join via `board:join`; the server verifies membership (or a public token) before admitting them.
4. **Live presence** — when someone starts editing/creating/moving a card or column, the client emits `card:editing`-style events; the server broadcasts `user:<action>` to everyone else in the room and `user:<action>:stop` when it ends. Peers show live badges on the affected card/column.
5. **Mutations** — REST routes (`/api/board`, `/api/column`, `/api/card`) persist changes with Prisma, then the server emits events (`card:moved`, `column:moved`, ...) to the board room. The frontend applies them optimistically and reconciles from the socket payload.
6. **Activity feed** — received `user:<action>` events are appended to an in-memory log on the frontend; a sidebar shows recent collaborator activity. Nothing is persisted server-side.
7. **Public sharing** — an owner can enable a public link (random token). Anyone with the link gets a read-only live view of the board.
8. **Email** — invites and password resets are sent through the Brevo API.

## Local setup

Prerequisites: Node.js 20.19+ (or 22.12+), npm, PostgreSQL (or a hosted Postgres/Neon URL).

### 1. Database

Set `DATABASE_URL` in `backend/.env` (see `backend/.env.example` for all variables). Then:

```bash
cd backend
npm install
npx prisma migrate deploy
```

### 2. Backend

Fill in `backend/.env`:

```env
PORT=8000
DATABASE_URL=<postgres connection string>
JWT_SECRET=<long random string>
BREVO_API_KEY=<brevo api key>
EMAIL_FROM_NAME=Flowline
EMAIL_FROM_ADDRESS=<verified sender>
FRONTEND_URL=http://localhost:5173
```

```bash
npm run dev
```

Backend runs on `http://localhost:8000` (health check at `/health`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. In dev, `vite.config.ts` proxies `/api` and `/socket.io` to the local backend — no env vars needed locally. On Vercel, set `VITE_API_URL` to the backend origin instead.

## Deployment

- **Backend** — Railway (Node service, root dir `/backend`, Postgres add-on). Build: `npx prisma generate --config=prisma7.config.ts && npm run build`, pre-deploy: `npx prisma migrate deploy --config=prisma7.config.ts`, start: `npm run start`.
- **Frontend** — Vercel (Vite, root dir `frontend`, output `dist`, Node 22.x). Set `VITE_API_URL` to the Railway domain; set Railway's `FRONTEND_URL` to the exact Vercel origin for CORS.
