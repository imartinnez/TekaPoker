/**
 * TekaPoker — Settlement Calculator (JavaScript port of the Python backend)
 *
 * calculateSettlements(players, rebuys)
 *
 * players = [{ id, name, avatar_color, points, buyIn }, ...]
 * buyIn per player allows different buy-in amounts within the same game.
 *
 * rebuys  = [{ buyerId, sellerId, amount }, ...]  (optional)
 *   A "recompra entre jugadores": the BUYER bought chips from the SELLER
 *   for `amount` euros, but did NOT pay in the moment. No new money enters
 *   the pot (those chips were already in play). The debt is settled at the
 *   end through the final liquidation.
 *
 *   Maths: the pot (for the value-per-point) only uses the bank buy-ins.
 *   But each player's NET uses an "effective buy-in":
 *       effectiveBuyIn = buyIn + (chips bought) − (chips sold)
 *   This keeps the sum of all nets at exactly 0, and the settlement
 *   automatically nets the inter-player chip debt against the game result.
 *
 * Returns { balances, transactions }
 *   balances     — one entry per player with their net gain/loss
 *   transactions — minimum set of cash transfers to settle all debts
 *
 * Algorithm: greedy matching — biggest debtor always pays biggest creditor
 * first, which minimises the total number of transfers.
 */
export function calculateSettlements(players, rebuys = []) {

  // ════════════════════════════════════════════════════════════
  // STEP 1 — Total points in play
  // Sum every player's chip count. This is the size of the pie.
  // ════════════════════════════════════════════════════════════
  const totalPoints = players.reduce((sum, p) => sum + Number(p.points), 0)

  // ════════════════════════════════════════════════════════════
  // STEP 2 — Total money in the pot
  // Sum each player's bank buy-in. Inter-player chip purchases do NOT
  // add money to the pot (those chips were already bought from the bank).
  // ════════════════════════════════════════════════════════════
  const totalMoney = players.reduce((sum, p) => sum + Number(p.buyIn), 0)

  // ════════════════════════════════════════════════════════════
  // STEP 2b — Rebuy adjustments per player
  // buyer's effective buy-in goes UP (they owe for chips received),
  // seller's effective buy-in goes DOWN (they're owed for chips given).
  // ════════════════════════════════════════════════════════════
  const adjustment = {}
  for (const r of rebuys) {
    const amt = Number(r.amount)
    if (!amt || amt <= 0 || !r.buyerId || !r.sellerId) continue
    adjustment[r.buyerId]  = (adjustment[r.buyerId]  || 0) + amt
    adjustment[r.sellerId] = (adjustment[r.sellerId] || 0) - amt
  }

  // ════════════════════════════════════════════════════════════
  // STEP 3 — Value of each point in euros
  // Guard against division by zero (everyone finished at 0).
  // ════════════════════════════════════════════════════════════
  const valuePerPoint = totalPoints === 0 ? 0 : totalMoney / totalPoints

  // ════════════════════════════════════════════════════════════
  // STEP 4 & 5 — Final money and net gain/loss per player
  // finalMoney    = points × valuePerPoint
  // effectiveBuyIn = buyIn + rebuy adjustment
  // net           = finalMoney − effectiveBuyIn
  // ════════════════════════════════════════════════════════════
  const balances = players.map((p) => {
    const playerBuyIn    = Number(p.buyIn)
    const adj            = adjustment[p.id] || 0
    const effectiveBuyIn = Math.round((playerBuyIn + adj) * 100) / 100
    const finalMoney     = Math.round(Number(p.points) * valuePerPoint * 100) / 100
    const net            = Math.round((finalMoney - effectiveBuyIn) * 100) / 100
    return {
      id:             p.id,
      name:           p.name,
      avatarColor:    p.avatar_color,
      points:         Number(p.points),
      buyIn:          playerBuyIn,
      rebuyAdjust:    Math.round(adj * 100) / 100,
      effectiveBuyIn,
      finalMoney,
      net,
    }
  })

  // ════════════════════════════════════════════════════════════
  // STEP 6 — Split into creditors and debtors
  // Creditors: net > 0.01  → they are OWED money
  // Debtors:   net < −0.01 → they OWE money
  // 0.01 tolerance ignores floating-point noise below 1 cent
  // ════════════════════════════════════════════════════════════
  const TOLERANCE = 0.01

  // Work on mutable copies so we can subtract as we settle
  const creditors = balances
    .filter((b) => b.net > TOLERANCE)
    .map((b) => ({ id: b.id, name: b.name, amount: b.net }))
    .sort((a, b) => b.amount - a.amount) // largest first

  const debtors = balances
    .filter((b) => b.net < -TOLERANCE)
    .map((b) => ({ id: b.id, name: b.name, amount: Math.abs(b.net) }))
    .sort((a, b) => b.amount - a.amount) // largest first

  // ════════════════════════════════════════════════════════════
  // STEP 7 — Greedy settlement algorithm
  //
  // Walk both lists with two pointers.
  // Each iteration: take biggest debtor + biggest creditor.
  //   → transfer = min(what debtor owes, what creditor is owed)
  //   → whoever hits 0 moves to the next person in their list
  // Repeat until all balances are settled.
  // ════════════════════════════════════════════════════════════
  const transactions = []
  let ci = 0 // creditor pointer
  let di = 0 // debtor pointer

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor   = debtors[di]

    // How much can we settle in this step?
    const amount = Math.round(Math.min(creditor.amount, debtor.amount) * 100) / 100

    if (amount > TOLERANCE) {
      transactions.push({
        fromId:   debtor.id,
        fromName: debtor.name,
        toId:     creditor.id,
        toName:   creditor.name,
        amount,
      })
    }

    // Reduce both outstanding balances
    creditor.amount = Math.round((creditor.amount - amount) * 100) / 100
    debtor.amount   = Math.round((debtor.amount   - amount) * 100) / 100

    // Move pointer for whoever is now settled
    if (creditor.amount <= TOLERANCE) ci++
    if (debtor.amount   <= TOLERANCE) di++
  }

  return { balances, transactions }
}
