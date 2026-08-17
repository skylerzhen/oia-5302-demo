interface NetworkStatusProps {
  offline: boolean
  onToggle: () => void
}

export function NetworkStatus({ offline, onToggle }: NetworkStatusProps) {
  return (
    <button
      type="button"
      className={`network-status ${offline ? 'offline' : 'online'}`}
      onClick={onToggle}
      title={offline ? 'Simulated offline mode: external egress blocked for demo' : 'Simulate offline policy (demo)'}
    >
      <span className="network-lamp" aria-hidden />
      <span className="network-label">
        {offline ? 'Simulated offline · egress blocked' : 'Connected · cloud demo'}
      </span>
    </button>
  )
}
