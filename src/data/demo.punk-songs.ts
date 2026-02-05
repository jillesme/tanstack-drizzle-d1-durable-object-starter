import { createServerFn } from '@tanstack/react-start'
import { getDb } from '@/db'
import { songs } from '@/db/schema'
import { count } from 'drizzle-orm'

const DEFAULT_SONGS = [
  { name: 'Teenage Dirtbag', artist: 'Wheatus' },
  { name: 'Smells Like Teen Spirit', artist: 'Nirvana' },
  { name: 'The Middle', artist: 'Jimmy Eat World' },
  { name: 'My Own Worst Enemy', artist: 'Lit' },
  { name: 'Fat Lip', artist: 'Sum 41' },
  { name: 'All the Small Things', artist: 'blink-182' },
  { name: 'Beverly Hills', artist: 'Weezer' },
]

export const getPunkSongs = createServerFn({
  method: 'GET',
}).handler(async () => {
  const db = getDb()
  const [{ total }] = await db.select({ total: count() }).from(songs)
  if (total === 0) {
    await db.insert(songs).values(DEFAULT_SONGS)
  }
  return await db.select().from(songs)
})
