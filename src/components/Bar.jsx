export default function Bar({ value, color = 'var(--accent)', track = 'var(--border)' }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div style={{ background: track, borderRadius: 999, height: 6, overflow: 'hidden' }}>
      <div style={{ background: color, width: `${v * 100}%`, height: '100%', borderRadius: 999, transition: 'width .5s ease' }} />
    </div>
  )
}
