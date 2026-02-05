# TanStack Start + Durable Objects Starter

A full-stack starter template combining [TanStack Start](https://tanstack.com/start) with [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/), [Drizzle ORM](https://orm.drizzle.team/), and WebSockets.

## What's Included

- **TanStack Start** — Full-stack React framework with file-based routing, server functions, SSR, and API routes
- **Cloudflare Durable Objects** — Stateful, single-threaded objects with built-in SQLite storage
- **Drizzle ORM** — Type-safe SQL queries running inside the Durable Object with auto-migrations
- **WebSocket Hibernation API** — Real-time cross-tab sync with cost-efficient hibernatable WebSockets
- **RPC Methods** — Call Durable Object methods directly from server functions (no fetch-based routing)
- **Tailwind CSS v4** — Utility-first styling

## Architecture

```
Browser ──► Worker (src/server.ts)
              ├── TanStack Start handler (routes, server functions, SSR)
              ├── WebSocket upgrade ──► Durable Object (src/durable-object.ts)
              └── Server functions ──► Durable Object (via RPC)

Durable Object
  ├── SQLite storage (via Drizzle ORM)
  ├── RPC methods: getCount(), increment(), decrement()
  └── WebSocket Hibernation API (broadcast updates to connected clients)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/server.ts` | Worker entry point — intercepts WebSocket upgrades, delegates to TanStack |
| `src/durable-object.ts` | Durable Object class with Drizzle, RPC methods, and WebSocket handlers |
| `src/routes/counter/$id.tsx` | Counter page — server functions, WebSocket client, optimistic UI |
| `src/db/do-schema.ts` | Drizzle schema for the DO's SQLite database |
| `drizzle/do-migrations/` | Generated migrations applied inside the DO on startup |
| `wrangler.jsonc` | Cloudflare Worker + Durable Object configuration |

## Use This Template

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)

### 1. Scaffold the project

```bash
$ npm create cloudflare@latest -- --template=jillesme/tanstack-drizzle-d1-durable-object-starter
# or pnpm
$ pnpm create cloudflare@latest --template=jillesme/tanstack-drizzle-d1-durable-object-starter
```

### 2. Create a D1 database

```bash 
$ npx wrangler d1 create my-app-db
# or pnpm
$ pnpm dlx wrangler d1 create my-app-db
```

Wrangler will output your database details:

```
✅ Successfully created DB 'my-app-db' in region WNAM

{
  "d1_databases": [
    {
      "binding": "my_app_db",
      "database_name": "my-app-db",
      "database_id": "xxxx-xxxx-xxxx-xxxx"
    }
  ]
}

✔ Would you like Wrangler to add it on your behalf? … no
```

Select **no** — you'll copy the values manually in the next step.

### 3. Configure `wrangler.jsonc`

Open `wrangler.jsonc` and replace the placeholder `database_name` and `database_id` in `d1_databases` with the values from above:

```jsonc
"d1_databases": [
    {
        "binding": "DB",
        "database_name": "my-app-db",
        "database_id": "xxxx-xxxx-xxxx-xxxx",
        "migrations_dir": "./drizzle/migrations"
    }
]
```

> **Note:** Keep the binding as `"DB"` — don't use the binding name from the wrangler output.

### 4. Install & run

Run migrations locally 

```bash
$ pnpm run db:migrate
igrations to be applied:
┌──────────────────────┐
│ name                 │
├──────────────────────┤
│ 0000_brave_mongu.sql │
└──────────────────────┘
✔ About to apply 1 migration(s)
Your database may not be available to serve requests during the migration, continue? … yes
🌀 Executing on local database DB (9dd1428b-60f7-4bf3-b373-699227a36538) from .wrangler/state/v3/d1:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
🚣 2 commands executed successfully.
┌──────────────────────┬────────┐
│ name                 │ status │
├──────────────────────┼────────┤
│ 0000_brave_mongu.sql │ ✅     │
└──────────────────────┴────────┘
$ pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to the **Counter** page. Open it in multiple tabs to see real-time WebSocket sync.
Or go to any routes and insert data.

### 5. Deploy

```bash
# Apply D1 migrations to your remote database
pnpm db:migrate --remote

# Build and deploy to Cloudflare
pnpm deploy
```

On first deploy, Wrangler will prompt you to log in.

## Development

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm deploy` | Build + deploy to Cloudflare |
| `pnpm db:generate` | Generate D1 migration after changing `src/db/schema.ts` |
| `pnpm db:generate:do` | Generate DO migration after changing `src/db/do-schema.ts` |
| `pnpm db:migrate` | Apply D1 migrations (add `--remote` for production, `--local` for local) |
| `pnpm cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |

### Customizing the Data Model

This template has two separate databases — use one or both depending on your use case.

**D1 (shared database)** — for data shared across your whole app (users, posts, etc.):

1. Edit `src/db/schema.ts`
2. Run `pnpm db:generate` to create a migration
3. Run `pnpm db:migrate --local` to apply locally, or `pnpm db:migrate --remote` before deploying

**Durable Object SQLite (per-object database)** — for data scoped to a single object instance (counters, rooms, sessions, etc.):

1. Edit `src/db/do-schema.ts`
2. Run `pnpm db:generate:do` to create a migration
3. Migrations are automatically applied when the Durable Object starts (via `blockConcurrencyWhile`)

The demo `songs` table in `src/db/schema.ts` and `counters` table in `src/db/do-schema.ts` are examples — replace them with your own tables.

### Adding a New Durable Object Method

1. Add your method to `src/durable-object.ts`:
   ```ts
   async reset(): Promise<number> {
     await this.db.update(counters).set({ count: 0 }).where(eq(counters.id, 1));
     this._broadcast(0);
     return 0;
   }
   ```

2. Call it from a server function in your route:
   ```ts
   const resetCounter = createServerFn({ method: 'POST' })
     .inputValidator((id: string) => id)
     .handler(async ({ data: id }) => {
       const stub = env.MY_DURABLE_OBJECT.getByName(id)
       return await stub.reset()
     })
   ```

### Modifying the DO Schema

1. Edit `src/db/do-schema.ts`
2. Run `pnpm db:generate:do` to generate a new migration
3. The migration is automatically applied when the Durable Object starts (via `blockConcurrencyWhile`)

### Accessing Cloudflare Bindings

This project uses `import { env } from 'cloudflare:workers'` to access bindings everywhere (server functions, server entry, etc.). No need for `getCloudflareContext()`.

## Demo Pages

This starter includes the default TanStack Start demo pages to showcase framework features:

- **Server Functions** — Server-side code called from client components
- **API Request** — Type-safe API endpoints
- **SSR Demos** — SPA mode, full SSR, and data-only SSR

These can be safely removed if you don't need them. Delete the `src/routes/demo/` directory and `src/data/demo.punk-songs.ts`, then remove the demo links from `src/components/Header.tsx`.

## Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Drizzle ORM + Durable Objects](https://orm.drizzle.team/docs/connect-cloudflare-do)
- [WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/api/websockets/)
- [Cloudflare Vite Plugin](https://developers.cloudflare.com/workers/frameworks/framework-guides/tanstack-start/)
