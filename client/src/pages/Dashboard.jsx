// ============================================================
//  pages/Dashboard.jsx  —  Student Main Dashboard
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI, trainingAPI } from '../api'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/layout/AppLayout'
import { Card, StatCard, ScoreBar, Badge, LoadingScreen } from '../components/ui'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { Code2, BookOpen, Trophy, Bell } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [trainingData, setTrainingData] = useState({ enrollments: [], unreadCount: 0 })

  useEffect(() => {
    analyticsAPI.getMyAnalytics().then(({ data }) => {
      setAnalytics(data.data.analytics)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    trainingAPI.getMy().then(({ data }) => {
      setTrainingData(data.data || { enrollments: [], unreadCount: 0 })
    }).catch(() => {})
  }, [])

  const refreshTrainings = () => {
    trainingAPI.getMy().then(({ data }) => {
      setTrainingData(data.data || { enrollments: [], unreadCount: 0 })
    }).catch(() => {})
  }

  const toggleTrainingTask = async (enrollmentId, phaseId, taskId, done) => {
    try {
      await trainingAPI.toggleTask(enrollmentId, phaseId, taskId, done)
      refreshTrainings()
    } catch {}
  }

  const markTrainingRead = async (enrollmentId) => {
    try {
      await trainingAPI.markRead(enrollmentId)
      refreshTrainings()
    } catch {}
  }

  if (loading) return <LoadingScreen />

  const a = analytics || {}
  const enrollments = trainingData.enrollments || []
  const unreadCount = trainingData.unreadCount || 0

  const subjectData = [
    { subject: 'DSA',  score: a.dsaScore  || 0 },
    { subject: 'DBMS', score: a.dbmsScore || 0 },
    { subject: 'OS',   score: a.osScore   || 0 },
    { subject: 'CN',   score: a.cnScore   || 0 },
  ]

  const radarData = subjectData.map(d => ({ subject: d.subject, A: d.score, fullMark: 100 }))

  return (
    <AppLayout>
      <div className="fade-in">

        {/* Header */}
        <div className="mb-8">
          <p className="text-slate-500 text-sm font-mono mb-1">WELCOME BACK</p>
          <h1 className="text-2xl font-bold text-white">{user?.name} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.cohort ? (
              <span>
                {typeof user.cohort === 'object' ? `${user.cohort.icon} ${user.cohort.name}` : 'Cohort selected'}
                {' · '}{user?.department}
              </span>
            ) : 'No cohort selected'}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Overall Score" value={`${a.overallScore || 0}%`} icon="🎯" color="#3b82f6" />
          <StatCard label="Code Solved"   value={a.codePassed || 0}          icon="💻" color="#22c55e" sub={`${a.totalCodeSubmissions || 0} attempts`} />
          <StatCard label="Modules Done"  value={a.modulesCompleted?.length || 0} icon="📚" color="#a855f7" />
          <StatCard label="Mock Interview" value={a.mockInterviewScore ? `${a.mockInterviewScore}%` : '—'} icon="🎤" color="#f59e0b" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Subject scores */}
          <Card>
            <div className="p-5">
              <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-widest font-mono">Subject Performance</h2>
              <div className="flex flex-col gap-4">
                {[
                  { label: 'DSA',  score: a.dsaScore  || 0, color: '#3b82f6' },
                  { label: 'DBMS', score: a.dbmsScore || 0, color: '#22c55e' },
                  { label: 'OS',   score: a.osScore   || 0, color: '#a855f7' },
                  { label: 'CN',   score: a.cnScore   || 0, color: '#f59e0b' },
                ].map(s => <ScoreBar key={s.label} {...s} />)}
              </div>
            </div>
          </Card>

          {/* Radar chart */}
          <Card>
            <div className="p-5">
              <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-widest font-mono">Skills Radar</h2>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1c2a42" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Radar dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Score bar chart */}
        <Card className="mb-6">
          <div className="p-5">
            <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-widest font-mono">Subject Scores</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={subjectData} barSize={32}>
                <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f1623', border: '1px solid #1c2a42', borderRadius: 8, color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Code2 size={20} />, label: 'Practice Coding', sub: `${a.codePassed || 0} solved`, color: '#22c55e', to: '/practice' },
            { icon: <BookOpen size={20} />, label: 'Learning Path', sub: `${a.modulesCompleted?.length || 0} modules done`, color: '#a855f7', to: '/modules' },
            { icon: <Trophy size={20} />, label: 'My Profile', sub: `CGPA: ${user?.cgpa || '—'}`, color: '#f59e0b', to: '/profile' },
          ].map(({ icon, label, sub, color, to }) => (
            <button
              key={to} onClick={() => navigate(to)}
              className="flex items-center gap-4 p-4 bg-[#0f1623] border border-[#1c2a42] rounded-xl hover:border-slate-600 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
                {icon}
              </div>
              <div>
                <div className="font-semibold text-sm text-white">{label}</div>
                <div className="text-xs text-slate-500">{sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Assigned roadmaps */}
        <Card className="mt-6">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white text-sm uppercase tracking-widest font-mono">Staff-assigned training roadmaps</h2>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Bell size={13} className={unreadCount > 0 ? 'text-amber-400' : 'text-slate-500'} />
                {unreadCount} unread
              </span>
            </div>

            {enrollments.length === 0 ? (
              <p className="text-sm text-slate-500">No training roadmap assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {enrollments.slice(0, 3).map((enr) => {
                  const total = (enr.phases || []).reduce((s, p) => s + (p.tasks || []).length, 0)
                  const done = (enr.phases || []).reduce((s, p) => s + (p.tasks || []).filter(t => t.done).length, 0)
                  const pct = total ? Math.round((done / total) * 100) : 0
                  return (
                    <div key={enr._id} className="p-3 rounded-lg border border-[#1c2a42] bg-[#151e30]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{enr.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{enr.roleSummary || 'Training assigned by staff'}</p>
                        </div>
                        {!enr.notificationRead && (
                          <button onClick={() => markTrainingRead(enr._id)}>
                            <Badge color="amber">Mark read</Badge>
                          </button>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 bg-[#1c2a42] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{done}/{total} tasks completed · {enr.status}</p>
                      {(enr.phases || []).slice(0, 1).map((phase) => (
                        <div key={phase._id} className="mt-2 pt-2 border-t border-[#1c2a42]">
                          <p className="text-xs text-slate-400 mb-1">{phase.title}</p>
                          <div className="space-y-1">
                            {(phase.tasks || []).slice(0, 3).map((task) => (
                              <label key={task._id} className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={task.done}
                                  onChange={() => toggleTrainingTask(enr._id, phase._id, task._id, !task.done)}
                                />
                                <span className={task.done ? 'line-through text-slate-500' : ''}>{task.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
