# One

One is a minimal adaptive task coach. A user describes the direction they want
their life to move, chooses one focus, and receives one concrete action for each
of the next three days. Completion and blocker check-ins shape the remaining
tasks.

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app works without an OpenAI key using a deterministic fallback planner. Add
`OPENAI_API_KEY` to `.env.local` to enable adaptive plans through the OpenAI
Responses API and Structured Outputs.

## Stack

- Next.js App Router and TypeScript
- SQLite with `better-sqlite3`
- Server-side password hashing and opaque cookie sessions
- OpenAI Responses API with Zod Structured Outputs

## Production notes

The local SQLite setup is intended for the web MVP. Before multi-instance
deployment, move the same schema to a managed Postgres provider and add email
verification, password reset, rate limiting, analytics, billing, and a formal
safety review.
