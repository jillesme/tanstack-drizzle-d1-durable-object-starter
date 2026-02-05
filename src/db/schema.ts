import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const songs = sqliteTable('songs', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  artist: text().notNull(),
});
