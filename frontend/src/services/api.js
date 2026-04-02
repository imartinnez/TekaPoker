/**
 * TekaPoker — API Service
 * Handles all HTTP calls to the FastAPI backend.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * POST /calculate
 * Sends players + buy-in to the backend and returns balances & transactions.
 *
 * @param {Array<{name: string, points: number}>} players
 * @param {number} buyIn  — amount each player paid to enter (euros)
 * @returns {Promise<{balances: Array, transactions: Array}>}
 */
export async function calculateSettlements(players, buyIn) {
  const response = await fetch(`${API_URL}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players, buy_in: buyIn }),
  })

  if (!response.ok) {
    // Try to extract a meaningful error message from the backend
    let detail = 'Calculation failed. Please check your inputs.'
    try {
      const body = await response.json()
      if (body.detail) {
        // FastAPI validation errors come as an array
        if (Array.isArray(body.detail)) {
          detail = body.detail.map((e) => e.msg).join(', ')
        } else {
          detail = body.detail
        }
      }
    } catch {
      // Ignore JSON parse errors; use the default message
    }
    throw new Error(detail)
  }

  return response.json()
}
