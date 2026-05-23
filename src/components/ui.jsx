// src/components/ui.jsx
// Shared reusable UI primitives

export function Card({ children, className = '' }) {
  return <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', ...parseStyle(className) }}>{children}</div>
}
function parseStyle(cls) { return {} } // just for compatibility

export function CardHeader({ title, icon: Icon, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
        {Icon && <Icon size={15} style={{ opacity: 0.6 }} />}
        {title}
      </div>
      {action}
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const map = {
    red:   { bg: 'var(--red-light)',    text: 'var(--red)' },
    green: { bg: 'var(--green-light)',  text: 'var(--green)' },
    amber: { bg: 'var(--amber-light)',  text: 'var(--amber)' },
    blue:  { bg: 'var(--accent2-light)',text: 'var(--accent2)' },
    gray:  { bg: 'var(--bg2)',          text: 'var(--text-secondary)' },
  }
  const c = map[color] || map.gray
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: c.bg, color: c.text }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {children}
    </span>
  )
}

export function MetricCard({ label, value, sub, color = 'blue', icon: Icon }) {
  const colors = {
    red:   { val: 'var(--red)',    bg: 'var(--red-light)' },
    green: { val: 'var(--green)',  bg: 'var(--green-light)' },
    amber: { val: 'var(--amber)',  bg: 'var(--amber-light)' },
    blue:  { val: 'var(--accent2)',bg: 'var(--accent2-light)' },
  }
  const c = colors[color]
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</div>
        {Icon && <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} style={{ color: c.val }} /></div>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -1, color: c.val, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export function ProgressBar({ label, pct, color = 'blue', valueLabel }) {
  const colors = { red: 'var(--red)', green: 'var(--green)', amber: 'var(--amber)', blue: 'var(--accent2)' }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{valueLabel || pct + '%'}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: colors[color], borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

export function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: -0.4 }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

export function FilterSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border2)', fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'var(--text-primary)', background: 'var(--white)', cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function DataTable({ columns, rows, rowKey }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.4, textTransform: 'uppercase', background: 'var(--bg)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={rowKey ? row[rowKey] : ri} style={{ transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', ...(col.mono ? { fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text-primary)' } : {}) }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardAction({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 5 }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent2-light)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}>
      {children}
    </button>
  )
}
