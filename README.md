# One

One is a minimal adaptive task coach. A user describes the direction they want
their life to move, chooses one focus, and receives a sequence of concrete
actions. Completion, blocker, and skip check-ins shape the remaining tasks.

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
- Capacitor Android shell
- SQLite with `better-sqlite3`
- Server-side password hashing and opaque cookie sessions
- OpenAI Responses API with Zod Structured Outputs

## Android

Build a debug APK for a phone on the same network:

```powershell
npm run android:build -- -ServerUrl http://YOUR-LAN-IP:3000
```

See [ANDROID.md](./ANDROID.md) for installation, release builds, and the
cross-platform synchronization architecture.

## Production notes

The local SQLite setup is intended for the web MVP. Before multi-instance
deployment, move the same schema to a managed Postgres provider and add email
verification, password reset, rate limiting, analytics, billing, and a formal
safety review.
