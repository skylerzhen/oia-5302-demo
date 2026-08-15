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
      title={offline ? 'Offline policy enabled: external browser egress is blocked' : 'Enable offline demo policy'}
    >
      <span className="network-lamp" aria-hidden />
      <span className="network-label">
        {offline ? 'Offline policy · egress blocked' : 'Connected · OIA intranet'}
      </span>
    </button>
  )
}
