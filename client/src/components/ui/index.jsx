// ============================================================
//  components/ui/index.jsx  —  Reusable UI Components
// ============================================================

// ── BUTTON ────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:  'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20',
    secondary:'bg-[#151e30] hover:bg-[#1c2a42] text-slate-200 border border-[#1c2a42]',
    danger:   'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20',
    ghost:    'hover:bg-white/5 text-slate-400 hover:text-slate-200',
    success:  'bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-500/20',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full spin" />}
      {children}
    </button>
  )
}

// ── INPUT ─────────────────────────────────────────────────
export function Input({ label, error, icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>}
        <input
          className={`w-full bg-[#0f1623] border ${error ? 'border-red-500/50' : 'border-[#1c2a42]'} rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── SELECT ────────────────────────────────────────────────
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">{label}</label>}
      <select
        className={`w-full bg-[#0f1623] border ${error ? 'border-red-500/50' : 'border-[#1c2a42]'} rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── CARD ──────────────────────────────────────────────────
export function Card({ children, className = '', accent }) {
  return (
    <div
      className={`bg-[#0f1623] border border-[#1c2a42] rounded-xl overflow-hidden ${className}`}
      style={accent ? { borderTop: `2px solid ${accent}` } : {}}
    >
      {children}
    </div>
  )
}

// ── BADGE ─────────────────────────────────────────────────
export function Badge({ children, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-500/10 text-blue-300 border-blue-500/20',
    green:  'bg-green-500/10 text-green-300 border-green-500/20',
    amber:  'bg-amber-500/10 text-amber-300 border-amber-500/20',
    red:    'bg-red-500/10 text-red-300 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    slate:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border font-mono ${colors[color]}`}>
      {children}
    </span>
  )
}

// ── SPINNER ───────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} border-2 border-blue-500/20 border-t-blue-500 rounded-full spin`} />
  )
}

// ── LOADING SCREEN ────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-slate-500 text-sm font-mono">Loading...</p>
      </div>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="text-5xl">{icon}</div>
      <div>
        <p className="font-semibold text-slate-200 mb-1">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────
export function StatCard({ label, value, icon, color = '#3b82f6', sub }) {
  return (
    <Card accent={color}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{icon}</span>
          <span className="text-xs font-mono text-slate-600 tracking-widest uppercase">{label}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
    </Card>
  )
}

// ── SCORE BAR ─────────────────────────────────────────────
export function ScoreBar({ label, score, color = '#3b82f6' }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400 font-mono">{label}</span>
        <span className="font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-1.5 bg-[#1c2a42] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── DIFFICULTY BADGE ──────────────────────────────────────
export function DiffBadge({ difficulty }) {
  const map = {
    easy:   { color: 'green',  label: 'Easy' },
    medium: { color: 'amber',  label: 'Medium' },
    hard:   { color: 'red',    label: 'Hard' },
  }
  const { color, label } = map[difficulty] || { color: 'slate', label: difficulty }
  return <Badge color={color}>{label}</Badge>
}
