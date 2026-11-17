# ORCA AI — QA starter platform

A runnable foundation for an AI SaaS product: Next.js chat UI, NestJS API, PostgreSQL/Prisma persistence, and an OpenAI-compatible chat provider.

> This is the first runnable QA release, not yet a production-complete ChatGPT replacement. Authentication, billing, streaming, document ingestion/RAG, agents, workflow execution, and enterprise tenancy are planned modules. The current `x-qa-user` identity is deliberately QA-only and must not be exposed publicly.

## Prerequisites
- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop / Docker Engine
- An OpenAI API key for live AI responses

## Run locally / QA

1. Copy `.env.example` to `.env` in the repository root.
2. Set `OPENAI_API_KEY` in `.env`. Keep it secret; do not put it in frontend variables.
3. Start PostgreSQL:
   ```bash
   docker compose up -d postgres
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Generate Prisma client and apply schema:
   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   ```
   If your shell does not pass the migration name correctly, run `npm --workspace apps/api exec prisma migrate dev -- --name init`.
6. Start both apps:
   ```bash
   npm run dev
   ```
7. Open the web app at http://localhost:3000. API health check: http://localhost:4000/health.

## QA smoke test
1. Open http://localhost:4000/health and confirm `status: ok`.
2. Open http://localhost:3000.
3. Send `Say hello and identify yourself as ORCA AI`.
4. Confirm the assistant response appears and the conversation is listed in the left sidebar.
5. Refresh the browser, reopen the conversation, and confirm message history is persisted.

## Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Reserved for the authentication module; use a strong random value |
| `OPENAI_API_KEY` | Server-side model provider key |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible endpoint |
| `OPENAI_CHAT_MODEL` | Default model setting (model allowlist currently controls chat choices) |
| `API_PORT` | API port, default 4000 |
| `NEXT_PUBLIC_API_URL` | Browser-visible API base URL |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |

## Important QA security notes
- The starter uses a fixed QA demo identity (`qa-demo-user`) and is not suitable for internet exposure or real customer data.
- Do not deploy this build to production until real authentication/JWT guards, per-user authorization, rate limiting, request logging controls, secrets management, abuse controls, and security testing are implemented.
- Change the sample database password and JWT secret outside local development.
- The provider key is only read by the backend. Never prefix it with `NEXT_PUBLIC_`.

## Project layout
```
apps/
  api/   NestJS REST API, Prisma schema, chat service
  web/   Next.js chat interface
infra/   Reserved for deployment manifests
```

## Current API
- `GET /health` — health check
- `GET /api/chat/conversations` — list QA user's conversations
- `GET /api/chat/conversations/:id` — fetch a conversation and messages
- `POST /api/chat/messages` — send a message; JSON `{ "message": "...", "conversationId": "optional", "model": "gpt-4o-mini" }`

The API currently accepts `x-qa-user` as a QA-only identity header. Do not trust this header in a deployed/shared environment.
