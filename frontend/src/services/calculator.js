/**
 * TekaPoker — Settlement Calculator (JavaScript port of the Python backend)
 *
 * calculateSettlements(players, buyIn)
 *
 * players = [{ id, name, avatar_color, points }, ...]
 * buyIn   = number (euros each player paid to enter)
 *
 * Returns { balances, transactions }
 *   balances     — one entry per player with their net gain/loss
 *   transactions — minimum set of cash transfers to settle all debts
 *
 * Algorithm: greedy matching — biggest debtor always pays biggest creditor
 * first, which minimises the total number of transfers.
 */
export function calculateSettlements(players, buyIn) {

  // ════════════════════════════════════════════════════════════
  // STEP 1 — Total points in play
  // Sum every player's chip count. This is the size of the pie.
  // ════════════════════════════════════════════════════════════
  const totalPoints = players.reduce((sum, p) => sum + Number(p.points), 0)

  // ════════════════════════════════════════════════════════════
  // STEP 2 — Total money in the pot
  // buyIn × number of players = the pot everyone is splitting.
  // ════════════════════════════════════════════════════════════
  const numPlayers = players.length
  const totalMoney = buyIn * numPlayers

  // ════════════════════════════════════════════════════════════
  // STEP 3 — Value of each point in euros
  // Guard against division by zero (everyone finished at 0).
  // ════════════════════════════════════════════════════════════
  const valuePerPoint = totalPoints === 0 ? 0 : totalMoney / totalPoints

  // ════════════════════════════════════════════════════════════
  // STEP 4 & 5 — Final money and net gain/loss per player
  // finalMoney = points × valuePerPoint
  // net        = finalMoney − buyIn  (positive = winner, negative = loser)
  // ════════════════════════════════════════════════════════════
  const balances = players.map((p) => {
    const finalMoney = Math.round(Number(p.points) * valuePerPoint * 100) / 100
    const net        = Math.round((finalMoney - buyIn) * 100) / 100
    return {
      id:          p.id,
      name:        p.name,
      avatarColor: p.avatar_color,
      points:      Number(p.points),
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
