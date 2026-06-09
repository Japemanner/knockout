import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

class NoopWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  readyState = 0
  binaryType: BinaryType = 'arraybuffer'
  bufferedAmount = 0
  protocol = ''
  url = ''

  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null
  onerror: ((this: WebSocket, ev: Event) => any) | null = null
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null
  onopen: ((this: WebSocket, ev: Event) => any) | null = null

  close() { return this }
  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView) { return this }
  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject, _options?: boolean | AddEventListenerOptions) { return this }
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject, _options?: boolean | AddEventListenerOptions) { return this }
  dispatchEvent(_event: Event) { return true }
}

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        transport: NoopWebSocket as unknown as typeof WebSocket,
      },
    },
  )

  return client
}