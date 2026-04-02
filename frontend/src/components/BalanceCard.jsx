/**
 * Shows one player's result: name, points, and net gain/loss.
 * Green for winners, red for losers, grey for break-even.
 */
export default function BalanceCard({ balance }) {
  const { name, points, net } = balance

  const isWin  = net >  0.005
  const isLose = net < -0.005

  const rowClass = isWin ? 'balance-row balance-row--win'
    : isLose ? 'balance-row balance-row--lose'
    : 'balance-row balance-row--even'

  const netClass = isWin ? 'balance-net balance-net--win'
    : isLose ? 'balance-net balance-net--lose'
    : 'balance-net balance-net--even'

  const sign   = isWin ? '+' : ''
  const symbol = isWin ? '▲' : isLose ? '▼' : '–'

  return (
    <div className={rowClass}>
      {/* Indicator symbol */}
      <span style={{ fontSize: '.75rem', opacity: .7 }}>{symbol}</span>

      {/* Name */}
      <span className="balance-name">{name}</span>

      {/* Points in small text */}
      <span className="balance-points">{points} pts</span>

      {/* Net amount */}
      <span className={netClass}>
        {sign}{formatEuro(net)}
      </span>
    </div>
  )
}

function formatEuro(amount) {
  return `€${Math.abs(amount).toFixed(2)}`
}
