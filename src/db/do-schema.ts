import { sqliteTable, integer } from "drizzle-orm/sqlite-core"

export const counters = sqliteTable('counters', {
  id: integer().primaryKey({ autoIncrement: true }),
  count: integer().default(0),
});
