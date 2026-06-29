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

The web MVP uses SQLite and should run as one Node service with a persistent
disk. `render.yaml` defines a Render web service that mounts `/var/data` and
sets `DATABASE_PATH=/var/data/one.db`.

Deploy from GitHub with Render Blueprints:

```text
https://render.com/deploy?repo=https://github.com/Matt-Aero/onetaskaday
```

During setup, provide `OPENAI_API_KEY` if you want adaptive plans. Without it,
the app uses the deterministic fallback planner. Before multi-instance
deployment, move the same schema to a managed Postgres provider and add email
verification, password reset, rate limiting, analytics, billing, and a formal
safety review.
