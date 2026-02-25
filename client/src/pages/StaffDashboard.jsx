import { useState, useEffect } from 'react'
import { analyticsAPI, cohortAPI } from '../api'
import AppLayout from '../components/layout/AppLayout'
import { Card, StatCard, Button, LoadingScreen, Spinner } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import api from '../api/axios'

const TOOLTIP = {
  contentStyle: { background: '#0f1623', border: '1px solid #1c2a42', borderRadius: 8, color: '#e2e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
}

const scoreColor = (s) => s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : s > 0 ? '#ef4444' : '#475569'

// ── STUDENT DETAIL DRAWER ─────────────────────────────────
function StudentDrawer({ student, onClose }) {
  const [detail,  setDetail]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = student.user?._id || student.user
    if (!uid) return setLoading(false)
    api.get(`/analytics/students/${uid}`)
      .then(({ data }) => { setDetail(data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const a = detail?.analytics || {}

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl bg-[#0a0e1a] border-l border-[#1c2a42] h-full overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-[#0a0e1a] border-b border-[#1c2a42] p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white">{student.user?.name || '—'}</h2>
            <p className="text-xs text-slate-500 font-mono">{student.user?.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Spinner /></div>
        ) : !detail ? (
          <div className="p-6 text-slate-500 text-sm text-center">No data found</div>
        ) : (
          <div className="p-5 flex flex-col gap-5">

            {/* Basic info */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Roll No',    value: student.user?.rollNumber || '—' },
                { label: 'CGPA',       value: student.user?.cgpa       || '—' },
                { label: 'Dept',       value: (student.user?.department || '—').split(' ')[0] },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#0f1623] border border-[#1c2a42] rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 font-mono mb-1">{label}</div>
                  <div className="text-sm font-bold text-white truncate">{value}</div>
                </div>
              ))}
            </div>

            {/* Subject scores */}
            <Card>
              <div className="p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-4">Subject Scores</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'DSA (Coding)',  score: student.dsaScore  || 0, color: '#3b82f6', sub: `${a.codePassed || 0} problems solved` },
                    { label: 'OS (MCQ)',      score: student.osScore   || 0, color: '#a855f7', sub: `${a.osAttempts   || 0} attempts` },
                    { label: 'DBMS (MCQ)',    score: student.dbmsScore || 0, color: '#22c55e', sub: `${a.dbmsAttempts || 0} attempts` },
                    { label: 'CN (MCQ)',      score: student.cnScore   || 0, color: '#f59e0b', sub: `${a.cnAttempts   || 0} attempts` },
                  ].map(({ label, score, color, sub }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{label}</span>
                        <span>
                          <span className="font-bold font-mono" style={{ color }}>{score}%</span>
                          <span className="text-slate-600 ml-2">{sub}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1c2a42] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* DSA breakdown */}
            <Card>
              <div className="p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">DSA Problems Solved</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Easy',   value: a.easyPassed   || 0, color: '#22c55e' },
                    { label: 'Medium', value: a.mediumPassed || 0, color: '#f59e0b' },
                    { label: 'Hard',   value: a.hardPassed   || 0, color: '#ef4444' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#151e30] border border-[#1c2a42] rounded-lg p-3 text-center">
                      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Module quiz scores */}
            <Card>
              <div className="p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">
                  Module Quiz Scores ({(a.moduleScores || []).length} completed)
                </h3>
                {(a.moduleScores || []).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {a.moduleScores.map((ms, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-[#151e30] rounded-lg border border-[#1c2a42]">
                        <span className="text-sm text-slate-300 truncate flex-1">{ms.module?.title || 'Module'}</span>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span className="text-sm font-bold font-mono" style={{ color: scoreColor(ms.score) }}>{ms.score}%</span>
                          <span className={`text-xs font-mono ${ms.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                            {ms.score >= 70 ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-sm">No module assessments taken yet</p>
                )}
              </div>
            </Card>

            {/* Recent code submissions */}
            <Card>
              <div className="p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">Recent Code Submissions</h3>
                {(detail.codeSubmissions || []).length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {detail.codeSubmissions.slice(0, 8).map((sub, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-[#151e30] rounded-lg border border-[#1c2a42] text-sm">
                        <span className="text-slate-300 truncate flex-1">{sub.question?.title || '—'}</span>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span className="text-xs text-slate-500 font-mono">{sub.language}</span>
                          <span className="text-xs font-bold font-mono" style={{ color: scoreColor(sub.score || 0) }}>{sub.score || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-sm">No code submissions yet</p>
                )}
              </div>
            </Card>

          </div>
        )}
      </div>
    </div>
  )
}

// ── SORT HEADER ───────────────────────────────────────────
function ColHeader({ col, label, sortBy, sortDir, onSort }) {
  const active = sortBy === col
  return (
    <th
      className="text-left px-3 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase cursor-pointer hover:text-slate-300 transition-colors whitespace-nowrap select-none"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
          : <ChevronDown size={12} className="opacity-20" />}
      </span>
    </th>
  )
}

// ── MAIN STAFF DASHBOARD ──────────────────────────────────
export default function StaffDashboard() {
  const [overview,  setOverview]  = useState(null)
  const [students,  setStudents]  = useState([])
  const [cohorts,   setCohorts]   = useState([])
  const [filter,    setFilter]    = useState({ cohort: '', search: '' })
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [sortBy,    setSortBy]    = useState('overallScore')
  const [sortDir,   setSortDir]   = useState('desc')

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview(),
      analyticsAPI.getAllStudents({ limit: 100 }),
      cohortAPI.getAll(),
    ]).then(([ov, st, co]) => {
      setOverview(ov.data.data || {})
      setStudents(st.data.data.students || [])
      setCohorts(co.data.data.cohorts || [])
      setLoading(false)
    }).catch(err => {
      console.error('Dashboard load error:', err)
      setLoading(false)
    })
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = filter.cohort ? { cohort: filter.cohort } : {}
      const { data } = await analyticsAPI.exportReport(params)
      const url  = URL.createObjectURL(new Blob([data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href  = url
      link.download = `KCT_Placement_${new Date().toISOString().slice(0,10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch(e) { console.error(e) }
    setExporting(false)
  }

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const filtered = students
    .filter(row => {
      // cohort filter — check Analytics.cohort field
      if (filter.cohort) {
        const rowCohortId = row.cohort?._id || row.cohort
        if (rowCohortId !== filter.cohort) return false
      }
      if (filter.search) {
        const q = filter.search.toLowerCase()
        const name  = (row.user?.name       || '').toLowerCase()
        const email = (row.user?.email      || '').toLowerCase()
        const roll  = (row.user?.rollNumber || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q) && !roll.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      return sortDir === 'desc' ? bv - av : av - bv
    })

  if (loading) return <LoadingScreen />

  const ov = overview || {}
  const avgData = [
    { subject: 'DSA',  score: Math.round(ov.avgScores?.avgDSA  || 0) },
    { subject: 'OS',   score: Math.round(ov.avgScores?.avgOS   || 0) },
    { subject: 'DBMS', score: Math.round(ov.avgScores?.avgDBMS || 0) },
    { subject: 'CN',   score: Math.round(ov.avgScores?.avgCN   || 0) },
  ]

  return (
    <AppLayout>
      {selected && <StudentDrawer student={selected} onClose={() => setSelected(null)} />}

      <div className="fade-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Staff Portal</p>
            <h1 className="text-2xl font-bold text-white">Placement Dashboard</h1>
          </div>
          <Button variant="secondary" onClick={handleExport} loading={exporting}>
            <Download size={15} /> Export CSV
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Students"  value={ov.totalStudents  || 0}   icon="👥" color="#3b82f6" />
          <StatCard label="Avg Score"       value={`${Math.round(ov.avgScores?.avgOverall || 0)}%`} icon="📊" color="#22c55e" />
          <StatCard label="Need Attention"  value={ov.needsAttention || 0}   icon="⚠️" color="#ef4444" sub="Overall < 50%" />
          <StatCard label="Active (7 days)" value={ov.recentSubmissions || 0} icon="⚡" color="#a855f7" sub="submissions" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <div className="p-5">
              <h2 className="font-bold text-white text-xs uppercase tracking-widest font-mono mb-4">Platform Average Scores</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={avgData} barSize={36}>
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h2 className="font-bold text-white text-xs uppercase tracking-widest font-mono mb-4">Students per Cohort</h2>
              {(ov.cohortBreakdown || []).length === 0 ? (
                <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No cohort data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={(ov.cohortBreakdown || []).map(c => ({ name: (c.cohortName || '').split(' ')[0], students: c.count }))} barSize={28}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP} />
                    <Bar dataKey="students" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Students table */}
        <Card>
          <div className="p-4 border-b border-[#1c2a42] flex flex-wrap gap-3 items-center">
            <h2 className="font-bold text-white text-xs uppercase tracking-widest font-mono flex-1">
              All Students <span className="text-slate-600 font-normal ml-1">({filtered.length})</span>
            </h2>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Name, email or roll no..."
                value={filter.search}
                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                className="bg-[#151e30] border border-[#1c2a42] rounded-lg pl-8 pr-4 py-1.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 w-52"
              />
            </div>
            <select
              value={filter.cohort}
              onChange={e => setFilter(f => ({ ...f, cohort: e.target.value }))}
              className="bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
            >
              <option value="">All Cohorts</option>
              {cohorts.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1c2a42]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">Student</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">Cohort</th>
                  <ColHeader col="dsaScore"     label="DSA"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader col="osScore"      label="OS"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader col="dbmsScore"    label="DBMS"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader col="cnScore"      label="CN"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase whitespace-nowrap">Modules</th>
                  <ColHeader col="overallScore" label="Overall" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-600 text-sm">No students found</td></tr>
                ) : filtered.map((row) => {
                  const cohortName = row.cohort?.name || ''
                  const modCount   = row.modulesCompleted?.length || 0
                  const modScores  = row.moduleScores || []
                  const modAvg     = modScores.length > 0
                    ? Math.round(modScores.reduce((a, m) => a + (m.score || 0), 0) / modScores.length)
                    : null

                  return (
                    <tr key={row._id} className="border-b border-[#1c2a42]/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-slate-200">{row.user?.name || '—'}</div>
                        <div className="text-xs text-slate-500 font-mono">{row.user?.rollNumber || row.user?.email || ''}</div>
                      </td>
                      <td className="px-3 py-3">
                        {cohortName
                          ? <span className="text-xs text-blue-300 font-mono">{cohortName.split(' ')[0]}</span>
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      {[row.dsaScore, row.osScore, row.dbmsScore, row.cnScore].map((score, i) => (
                        <td key={i} className="px-3 py-3">
                          <span className="text-sm font-mono font-bold" style={{ color: scoreColor(score || 0) }}>
                            {score || 0}%
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <span className="text-sm font-mono text-slate-300">{modCount}</span>
                        {modAvg !== null && (
                          <span className="text-xs font-mono ml-1.5" style={{ color: scoreColor(modAvg) }}>({modAvg}%)</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-sm font-mono" style={{ color: scoreColor(row.overallScore || 0) }}>
                          {row.overallScore || 0}%
                        </span>
                        {(row.overallScore || 0) > 0 && (row.overallScore || 0) < 40 && (
                          <span className="ml-1 text-xs">⚠️</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setSelected(row)}
                          className="px-3 py-1 bg-[#151e30] border border-[#1c2a42] rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:border-blue-500/30 transition-all font-mono whitespace-nowrap"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-[#1c2a42] flex items-center gap-5">
            <span className="text-xs text-slate-600">Score legend:</span>
            {[['#22c55e','≥70% Good'],['#f59e0b','40-69% Average'],['#ef4444','<40% Needs help']].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}