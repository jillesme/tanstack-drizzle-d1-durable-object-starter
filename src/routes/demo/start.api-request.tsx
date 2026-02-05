import { useEffect, useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'

interface Song {
  id: number
  name: string
  artist: string
}

function getSongs() {
  return fetch('/demo/api/songs').then((res) => res.json() as Promise<Song[]>)
}

function addSong(name: string, artist: string) {
  return fetch('/demo/api/songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, artist }),
  }).then((res) => res.json() as Promise<Song>)
}

export const Route = createFileRoute('/demo/start/api-request')({
  component: Home,
})

function Home() {
  const [songs, setSongs] = useState<Song[]>([])
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchSongs = useCallback(() => {
    getSongs().then(setSongs)
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedArtist = artist.trim()
    if (!trimmedName || !trimmedArtist) return

    setIsSubmitting(true)
    try {
      const inserted = await addSong(trimmedName, trimmedArtist)
      setSongs((prev) => [...prev, inserted])
      setName('')
      setArtist('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
      <div className="w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          Start API Request Demo - Songs
        </h1>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Song name..."
            className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist..."
            className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !artist.trim()}
            className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-400 disabled:bg-zinc-700 disabled:cursor-not-allowed font-bold transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </form>

        {songs.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No songs yet. Add one above to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {songs.map((song) => (
              <li
                key={song.id}
                className="bg-white/10 border border-white/20 rounded-lg p-3 backdrop-blur-sm shadow-md"
              >
                <span className="text-lg text-white font-medium">
                  {song.name}
                </span>
                <span className="text-white/60"> - {song.artist}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
