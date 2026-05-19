# TaskFlow

> A full-stack Kanban task manager — organize work into boards, lists, and drag-and-drop cards.

TaskFlow is a portfolio project that demonstrates a complete, production-style web
application: a typed REST API, token-based authentication, a relational database,
a single-page React frontend, automated tests, and CI.

![Tech](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20SQLite-blue)
![Language](https://img.shields.io/badge/language-TypeScript-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **User accounts** — register / log in with hashed passwords (bcrypt) and JWT sessions.
- **Boards** — create multiple project boards; each board is private to its owner.
- **Lists & cards** — add lists (columns) and cards, edit titles/descriptions, delete.
- **Drag and drop** — move cards within and between lists; order is persisted.
- **Protected routes** — the API and the UI both gate access behind authentication.
- **Input validation** — every request body is validated with Zod before it hits the DB.
- **Tested** — backend integration tests with Vitest + Supertest.
- **CI** — GitHub Actions runs typecheck, build, and tests on every push.

## Tech stack

| Layer     | Technology                                            |
|-----------|-------------------------------------------------------|
| Frontend  | React 18, TypeScript, Vite, React Router              |
| Backend   | Node.js, Express 4, TypeScript                        |
| Database  | SQLite (via `better-sqlite3`)                         |
| Auth      | JSON Web Tokens, bcryptjs                             |
| Testing   | Vitest, Supertest                                     |
| Tooling   | ESLint-friendly structure, Concurrently, GitHub Actions |

## Project structure

```
taskflow/
├── client/                 # React + Vite single-page app
│   └── src/
│       ├── api/            # typed fetch wrapper
│       ├── context/        # auth context/provider
│       ├── components/     # reusable UI (Navbar, Card, Column, ...)
│       └── pages/          # Login, Register, Boards, Board
├── server/                 # Express REST API
│   └── src/
│       ├── db/             # SQLite connection + schema
│       ├── middleware/     # auth guard + error handler
│       ├── controllers/    # request handlers
│       ├── routes/         # route definitions
│       └── utils/          # validation schemas, helpers
└── package.json            # root scripts to run both apps together
```

## Getting started

### Prerequisites

- Node.js 18+ and npm

### 1. Install dependencies

```bash
git clone https://github.com/your-username/taskflow.git
cd taskflow
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

The defaults work out of the box for local development. For anything real,
change `JWT_SECRET` in `server/.env`.

### 3. Run the app

```bash
npm run dev
```

- API → http://localhost:4000
- Web → http://localhost:5173

The SQLite database file is created automatically on first run.

## Available scripts (root)

| Command               | Description                                      |
|-----------------------|--------------------------------------------------|
| `npm run install:all` | Install root, server, and client dependencies    |
| `npm run dev`         | Run API and web app together (hot reload)        |
| `npm run build`       | Type-check and build both apps for production     |
| `npm test`            | Run the backend test suite                       |
| `npm run typecheck`   | Type-check both apps without emitting             |

## API overview

All endpoints are prefixed with `/api`. Protected routes require an
`Authorization: Bearer <token>` header.

| Method | Endpoint                  | Description                  | Auth |
|--------|---------------------------|------------------------------|------|
| POST   | `/api/auth/register`      | Create an account            | No   |
| POST   | `/api/auth/login`         | Log in, returns a JWT        | No   |
| GET    | `/api/auth/me`            | Current user                 | Yes  |
| GET    | `/api/boards`             | List the user's boards       | Yes  |
| POST   | `/api/boards`             | Create a board               | Yes  |
| GET    | `/api/boards/:id`         | Board with lists and cards   | Yes  |
| DELETE | `/api/boards/:id`         | Delete a board               | Yes  |
| POST   | `/api/boards/:id/lists`   | Add a list to a board        | Yes  |
| PATCH  | `/api/lists/:id`          | Rename a list                | Yes  |
| DELETE | `/api/lists/:id`          | Delete a list                | Yes  |
| POST   | `/api/lists/:id/cards`    | Add a card to a list         | Yes  |
| PATCH  | `/api/cards/:id`          | Edit / move a card           | Yes  |
| DELETE | `/api/cards/:id`          | Delete a card                | Yes  |

## Testing

```bash
npm test
```

Tests use an in-memory SQLite database, so they never touch your dev data.

## Possible next steps

Ideas tracked for future iterations:

- Board sharing / collaborators
- Card labels, due dates, and search
- Optimistic UI updates
- Docker Compose for one-command setup
- Deploy (Render/Fly.io for the API, Vercel for the client)

## License

[MIT](LICENSE)
