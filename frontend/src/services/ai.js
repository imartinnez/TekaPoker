/**
 * TekaPoker — AI client wrapper.
 * Calls our own serverless function at /api/chat (which holds the Groq key).
 * The browser never sees the API key.
 */
export async function askAI({ question, viewerName, payload }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, viewerName, payload }),
  })

  if (!res.ok) {
    let msg = 'No se pudo contactar con el analista IA.'
    try {
      const data = await res.json()
      if (data?.error) msg = data.error
    } catch {
      /* ignore parse errors */
    }
    if (res.status === 404) {
      msg = 'El analista IA aún no está disponible (falta desplegar la función en Vercel).'
    }
    throw new Error(msg)
  }

  const data = await res.json()
  return data.answer
}
