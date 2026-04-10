// src/components/CountdownTimer.tsx
interface Props {
  seconds: number
  label: string
}

export function CountdownTimer({ seconds, label }: Props) {
  return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 80, fontWeight: 700, color: seconds <= 5 ? '#dc3545' : '#0d6efd', lineHeight: 1 }}>
        {seconds}
      </div>
      <div style={{ color: '#6c757d', fontSize: 16, marginTop: 8 }}>{label}</div>
    </div>
  )
}
