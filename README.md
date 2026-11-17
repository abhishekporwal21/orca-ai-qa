# ORCA AI — QA starter platform

A QA foundation for an independently operated AI platform: Next.js chat UI, NestJS API, PostgreSQL/Prisma persistence, and an ORCA model gateway that connects to a self-hosted open-weight language model.

> This release removes the OpenAI SDK and OpenAI API dependency. The chat API now sends inference requests directly from the backend to an ORCA-controlled model server. A dedicated GPU inference server must be deployed and configured before chat responses can be generated.

## Architecture

- **Web:** Next.js chat application.
- **API:** NestJS REST API and model gateway.
- **Inference:** Self-hosted open-weight model served by vLLM (recommended) or another server exposing the compatible `/chat/completions` HTTP contract.
- **Model starting point:** Qwen3-8B (configurable using `ORCA_MODEL_NAME`).
- **Data:** PostgreSQL and Prisma.
- **Secrets:** Model gateway credentials remain on the backend; never expose them as `NEXT_PUBLIC_*` variables.

The model gateway uses a compatible request/response format, but it does not call OpenAI. The inference URL must point to infrastructure controlled by ORCA.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop / Docker Engine for local PostgreSQL
- A self-hosted inference server with a compatible chat-completions endpoint
- A GPU host sized for the selected model and its context length

## Run locally / QA

1. Copy `.env.example` to `.env` in the repository root.
2. Start PostgreSQL:
   ```bash
   docker compose up -d postgres
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma client and apply schema:
   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   ```
5. Start both applications:
   ```bash
   npm run dev
   ```
6. Open the web app at http://localhost:3000. API health check: http://localhost:4000/health.

Without a configured self-hosted model server, the web application and API health endpoint can run, but chat returns a clear model-engine-not-configured response.

## Configure the self-hosted model server

Set these variables on the **API service only**:

| Variable | Purpose | Example |
|---|---|---|
| `ORCA_MODEL_BASE_URL` | Private base URL of the self-hosted inference server, including its API prefix | `http://GPU_HOST:8000/v1` |
| `ORCA_MODEL_NAME` | Model identifier loaded by the inference server | `Qwen/Qwen3-8B` |
| `ORCA_MODEL_API_KEY` | Optional bearer token if the private gateway requires it | Keep secret |

The API calls `POST {ORCA_MODEL_BASE_URL}/chat/completions`. The inference server must accept a chat-completions JSON body and return `choices[0].message.content`. Do not set this URL to a commercial provider. It must be the ORCA-operated GPU endpoint.

## Current API

- `GET /health` — API health check
- `GET /api/chat/models` — reports the configured self-hosted model and whether its endpoint is configured
- `GET /api/chat/conversations` — list QA user's conversations
- `GET /api/chat/conversations/:id` — fetch a conversation and messages
- `POST /api/chat/messages` — send a message; JSON `{ "message": "...", "conversationId": "optional" }`

The API uses a QA-only demo identity (`x-qa-user`, default `qa-demo-user`). Replace it with verified authentication before public or production exposure.

## Deployment notes

- Keep the existing frontend, API and PostgreSQL services on Render if desired.
- Do **not** run the language model on the current free Render instance; it does not have sufficient memory or GPU resources.
- Deploy the inference server on a dedicated GPU host with a private network path to the API.
- Configure `ORCA_MODEL_BASE_URL` to the GPU server's private endpoint where possible. Do not expose the inference port publicly without authentication, firewall rules and TLS.
- The API service needs outbound network access to the GPU endpoint. If the GPU host cannot be privately networked with Render, use a secured VPN or private gateway.
- After configuring the model endpoint, redeploy the API and verify `GET /api/chat/models` returns `configured: true`, then send a chat smoke test.

## QA security notes

- This starter uses a fixed QA demo identity and is not suitable for real customer data or unrestricted public access.
- Before production, implement real authentication/JWT guards, per-user authorization, rate limiting, request logging controls, secrets management, abuse controls, and security testing.
- Never commit model gateway tokens or database credentials.
