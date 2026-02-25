// ============================================================
//  pages/PracticePage.jsx  —  Coding Problems List
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { questionAPI, submissionAPI } from '../api'
import AppLayout from '../components/layout/AppLayout'
import { Card, Badge, DiffBadge, Button, LoadingScreen, EmptyState } from '../components/ui'
import { Search, Code2 } from 'lucide-react'

export default function PracticePage() {
  const navigate = useNavigate()
  const [questions, setQuestions]   = useState([])
  const [loading,   setLoading]     = useState(true)
  const [filter,    setFilter]      = useState({ difficulty: '', topic: '', search: '' })

  useEffect(() => {
    questionAPI.getAll({ type: 'coding', limit: 50 }).then(({ data }) => {
      setQuestions(data.data.questions)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = questions.filter(q => {
    if (filter.difficulty && q.difficulty !== filter.difficulty) return false
    if (filter.topic && q.topic !== filter.topic) return false
    if (filter.search && !q.title.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  const topics = [...new Set(questions.map(q => q.topic))]

  if (loading) return <LoadingScreen />

  return (
    <AppLayout>
      <div className="fade-in">
        <div className="mb-6">
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Coding Practice</p>
          <h1 className="text-2xl font-bold text-white">Problems</h1>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Search problems..."
                value={filter.search}
                onChange={e => setFilter({ ...filter, search: e.target.value })}
                className="w-full bg-[#151e30] border border-[#1c2a42] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <select
              value={filter.difficulty}
              onChange={e => setFilter({ ...filter, difficulty: e.target.value })}
              className="bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              value={filter.topic}
              onChange={e => setFilter({ ...filter, topic: e.target.value })}
              className="bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
            >
              <option value="">All Topics</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </Card>

        {/* Problems table */}
        {filtered.length === 0 ? (
          <EmptyState icon="💻" title="No problems found" description="Try adjusting your filters" />
        ) : (
          <Card>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1c2a42]">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">#</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">Topic</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">Difficulty</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, i) => (
                  <tr key={q._id} className="border-b border-[#1c2a42]/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-sm">{i + 1}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-200 text-sm">{q.title}</td>
                    <td className="px-5 py-3.5">
                      <Badge color="blue">{q.topic}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <DiffBadge difficulty={q.difficulty} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/practice/${q._id}`)}>
                        <Code2 size={13} /> Solve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
