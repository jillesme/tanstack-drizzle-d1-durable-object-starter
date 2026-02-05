import { DurableObject } from "cloudflare:workers"
import { drizzle, DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import { eq } from 'drizzle-orm';
import migrations from '../drizzle/do-migrations';
import { counters } from './db/do-schema';

export class MyDurableObject extends DurableObject<Env> {
  // https://orm.drizzle.team/docs/connect-cloudflare-do
  storage: DurableObjectStorage;
  db: DrizzleSqliteDODatabase<any>;

  constructor(ctx: DurableObjectState, env: Env) {
    // Required, as we're extending the base class.
    super(ctx, env)

    this.storage = ctx.storage;
    this.db = drizzle(this.storage, { logger: false });

    // Make sure all migrations complete before accepting queries.
    // Otherwise you will need to run `this.migrate()` in any function
    // that accesses the Drizzle database `this.db`.
    ctx.blockConcurrencyWhile(async () => {
      await migrate(this.db, migrations);
    });
  }

  // ---------------------------------------------------------------------------
  // Helper: get or create the single counter row (id=1)
  // ---------------------------------------------------------------------------
  private async _getOrCreateCounter(): Promise<number> {
    const rows = await this.db.select().from(counters).where(eq(counters.id, 1));
    if (rows.length === 0) {
      await this.db.insert(counters).values({ id: 1, count: 0 });
      return 0;
    }
    return rows[0].count ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Helper: broadcast current count to every connected WebSocket
  // ---------------------------------------------------------------------------
  private _broadcast(count: number) {
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(JSON.stringify({ type: 'update', count }));
    }
  }

  // ---------------------------------------------------------------------------
  // RPC methods (called from server functions via stub.increment(), etc.)
  // ---------------------------------------------------------------------------
  async getCount(): Promise<number> {
    return this._getOrCreateCounter();
  }

  async increment(): Promise<number> {
    const current = await this._getOrCreateCounter();
    const newCount = current + 1;
    await this.db.update(counters).set({ count: newCount }).where(eq(counters.id, 1));
    this._broadcast(newCount);
    return newCount;
  }

  async decrement(): Promise<number> {
    const current = await this._getOrCreateCounter();
    const newCount = current - 1;
    await this.db.update(counters).set({ count: newCount }).where(eq(counters.id, 1));
    this._broadcast(newCount);
    return newCount;
  }

  // ---------------------------------------------------------------------------
  // WebSocket upgrade handler (fetch is ONLY used for WebSocket connections)
  // ---------------------------------------------------------------------------
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket using the Hibernation API so the DO can hibernate
    // while keeping connections alive.
    this.ctx.acceptWebSocket(server);

    // Send the current count immediately so the client is in sync
    const count = await this._getOrCreateCounter();
    server.send(JSON.stringify({ type: 'update', count }));

    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------------------------------------------------------------------------
  // WebSocket Hibernation API handlers
  // ---------------------------------------------------------------------------
  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer) {
    // Currently no client-to-server messages are expected.
    // You could extend this to handle messages from the client.
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
    ws.close(code, reason);
  }
}
