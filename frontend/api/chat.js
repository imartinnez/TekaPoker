/**
 * TekaPoker — AI analyst serverless function (Vercel, Node runtime).
 *
 * Receives the precomputed analytics payload from the browser and asks
 * Groq (free tier, OpenAI-compatible API) to answer a question about it.
 *
 * The model is instructed to ONLY use the provided data — it must never
 * invent statistics. This is a lightweight RAG: the "retrieval" is the
 * structured JSON we send, and the model just reads it.
 *
 * Required env var (set in Vercel → Settings → Environment Variables):
 *   GROQ_API_KEY   — your key from https://console.groq.com (starts with gsk_)
 * Optional:
 *   GROQ_MODEL     — defaults to llama-3.3-70b-versatile
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido.' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.status(500).json({
      error: 'Falta configurar GROQ_API_KEY en Vercel.',
    })
    return
  }

  // Parse body (Vercel parses JSON automatically, but guard for strings)
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const { question, viewerName, payload } = body || {}

  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'Pregunta vacía.' })
    return
  }
  if (question.length > 500) {
    res.status(400).json({ error: 'La pregunta es demasiado larga.' })
    return
  }

  const dataJson = JSON.stringify(payload ?? {})
  // Safety cap so we never send an enormous prompt
  if (dataJson.length > 60000) {
    res.status(400).json({ error: 'Demasiados datos para analizar.' })
    return
  }

  const systemPrompt = [
    'Eres el analista de datos de TekaPoker, una app que registra partidas de póker entre amigos.',
    'Respondes SIEMPRE en español, de forma breve, clara y con un punto de humor de colegas.',
    '',
    'REGLAS ESTRICTAS:',
    '1. Solo puedes usar los datos del JSON que se te proporciona. No inventes NUNCA cifras, nombres ni partidas.',
    '2. Si la respuesta no está en los datos, di claramente: "No tengo ese dato registrado".',
    '3. Todos los importes están en euros (€). "neto" = ganancia/pérdida acumulada. Positivo = gana, negativo = pierde.',
    '4. "volatilidad" alta = resultados muy irregulares; baja = jugador consistente.',
    '5. "tendencia" up = mejorando últimamente, down = empeorando, flat = estable.',
    '6. No te inventes consejos de estrategia de póker que no se deduzcan de los datos.',
    '7. Cuando cites números, usa los del JSON tal cual (redondeados a 2 decimales como mucho).',
    '',
    `La persona que te habla dice ser el jugador: "${viewerName || 'desconocido'}". Dirígete a ella en segunda persona ("tú") y, cuando tenga sentido, compara sus datos con el resto del grupo.`,
  ].join('\n')

  const userPrompt = [
    'DATOS DEL GRUPO (en formato JSON):',
    dataJson,
    '',
    `PREGUNTA: ${question}`,
  ].join('\n')

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!groqRes.ok) {
      const detail = await groqRes.text()
      console.error('Groq error:', groqRes.status, detail)
      res.status(502).json({
        error: 'El analista IA no está disponible ahora mismo. Inténtalo en un momento.',
      })
      return
    }

    const data = await groqRes.json()
    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      'No he podido generar una respuesta.'

    res.status(200).json({ answer })
  } catch (err) {
    console.error('Handler error:', err)
    res.status(500).json({ error: 'Error interno del analista IA.' })
  }
}
