import { useState, useEffect, useCallback, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

// ---------------------------------------------------------------------------
// Server functions — these run on the Worker and call the DO via RPC
// ---------------------------------------------------------------------------

const getCounterValue = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const stub = env.MY_DURABLE_OBJECT.getByName(id)
    return await stub.getCount()
  })

const incrementCounter = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const stub = env.MY_DURABLE_OBJECT.getByName(id)
    return await stub.increment()
  })

const decrementCounter = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const stub = env.MY_DURABLE_OBJECT.getByName(id)
    return await stub.decrement()
  })

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/counter/$id')({
  component: CounterPage,
  loader: async ({ params }) => await getCounterValue({ data: params.id }),
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CounterPage() {
  const initialCount = Route.useLoaderData()
  const { id } = Route.useParams()

  const [count, setCount] = useState(initialCount)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // WebSocket connection for real-time cross-tab sync
  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${location.host}/counter/${id}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.addEventListener('open', () => {
      setIsConnected(true)
    })

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'update' && typeof data.count === 'number') {
          setCount(data.count)
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.addEventListener('close', () => {
      setIsConnected(false)
    })

    ws.addEventListener('error', () => {
      setIsConnected(false)
    })

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [id])

  const handleIncrement = useCallback(async () => {
    // Optimistic update
    setCount((prev) => prev + 1)
    try {
      const newCount = await incrementCounter({ data: id })
      setCount(newCount)
    } catch {
      // Revert on error
      setCount((prev) => prev - 1)
    }
  }, [id])

  const handleDecrement = useCallback(async () => {
    // Optimistic update
    setCount((prev) => prev - 1)
    try {
      const newCount = await decrementCounter({ data: id })
      setCount(newCount)
    } catch {
      // Revert on error
      setCount((prev) => prev + 1)
    }
  }, [id])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
      <div className="w-full max-w-md p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Counter</h1>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}
            />
            <span className="text-zinc-400">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6">
          Durable Object: <code className="text-zinc-300">{id}</code>
        </p>

        {/* Counter display */}
        <div className="flex items-center justify-center py-10">
          <span className="text-8xl font-bold tabular-nums tracking-tight">
            {count}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDecrement}
            className="flex-1 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-xl font-bold transition-colors cursor-pointer"
          >
            -
          </button>
          <button
            onClick={handleIncrement}
            className="flex-1 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-400 text-xl font-bold transition-colors cursor-pointer"
          >
            +
          </button>
        </div>

        <p className="text-xs text-zinc-500 text-center mt-6">
          Open this page in multiple tabs to see real-time sync via WebSockets.
        </p>
      </div>
    </div>
  )
}
