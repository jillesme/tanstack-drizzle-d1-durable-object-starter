import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getDb } from '@/db'
import { songs } from '@/db/schema'

export const Route = createFileRoute('/demo/api/songs')({
  server: {
    handlers: {
      GET: async () => {
        const db = getDb()
        const rows = await db.select().from(songs)
        return json(rows)
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as { name: string; artist: string }

        if (!body.name || typeof body.name !== 'string') {
          return json({ error: 'name is required' }, { status: 400 })
        }
        if (!body.artist || typeof body.artist !== 'string') {
          return json({ error: 'artist is required' }, { status: 400 })
        }

        const db = getDb()
        const inserted = await db
          .insert(songs)
          .values({ name: body.name, artist: body.artist })
          .returning()

        return json(inserted[0], { status: 201 })
      },
    },
  },
})
