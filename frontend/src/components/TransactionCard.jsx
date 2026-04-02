import { ArrowRight } from 'lucide-react'

/**
 * Displays a single settlement transaction:
 *   "Alice  →  Bob  €5.00"
 */
export default function TransactionCard({ transaction, index }) {
  const { from, to, amount } = transaction

  return (
    <div className="transaction-row">
      {/* Sequential number */}
      <span style={{ color: 'var(--text-faint)', fontSize: '.75rem', fontWeight: 700, minWidth: 18 }}>
        {index + 1}
      </span>

      {/* Payer (red — they owe money) */}
      <span className="tx-from">{from}</span>

      {/* Arrow */}
      <span className="tx-arrow">
        <ArrowRight size={16} />
      </span>

      {/* Receiver (green — they get money) */}
      <span className="tx-to">{to}</span>

      {/* Amount pill */}
      <span className="tx-amount">€{amount.toFixed(2)}</span>
    </div>
  )
}
