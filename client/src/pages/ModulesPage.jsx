// Pure learning path — no assessments here
import { useState, useEffect } from 'react'
import { cohortAPI } from '../api'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/layout/AppLayout'
import { Card, LoadingScreen, EmptyState } from '../components/ui'
import { PlayCircle, ExternalLink, ChevronRight, BookOpen, FileText, Youtube, Wrench } from 'lucide-react'

export default function ModulesPage() {
  const { user }             = useAuthStore()
  const [modules,  setModules]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  const cohortId = typeof user?.cohort === 'object' ? user.cohort._id : user?.cohort

  useEffect(() => {
    if (!cohortId) return setLoading(false)
    cohortAPI.getModules(cohortId).then(({ data }) => {
      setModules(data.data.modules || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [cohortId])

  if (loading) return <LoadingScreen />

  const cohortName = typeof user?.cohort === 'object' ? user.cohort.name : 'Your Cohort'
  const cohortIcon = typeof user?.cohort === 'object' ? user.cohort.icon : '📚'

  const resourceIcon = (type) => ({
    video:   <Youtube size={15} className="text-red-400" />,
    notes:   <FileText size={15} className="text-blue-400" />,
    article: <BookOpen size={15} className="text-amber-400" />,
    project: <Wrench size={15} className="text-purple-400" />,
  }[type] || <FileText size={15} className="text-slate-400" />)

  const resourceColor = (type) => ({
    video:   'text-red-300',
    notes:   'text-blue-300',
    article: 'text-amber-300',
    project: 'text-purple-300',
  }[type] || 'text-slate-400')

  return (
    <AppLayout>
      <div className="fade-in">
        <div className="mb-6">
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Learning Path</p>
          <h1 className="text-2xl font-bold text-white">{cohortIcon} {cohortName}</h1>
          <p className="text-slate-500 text-sm mt-1">{modules.length} modules · Study the materials then take assessments separately</p>
        </div>

        {/* Info banner */}
        <div className="mb-6 p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-3">
          <span className="text-blue-400 mt-0.5 flex-shrink-0">💡</span>
          <p className="text-sm text-slate-400">
            This section is for <span className="text-blue-300 font-medium">learning only</span>.
            Study the videos, notes and articles here, then head to the{' '}
            <span className="text-blue-300 font-medium">Assessments</span> section to test yourself on OS, DBMS and CN.
          </p>
        </div>

        {modules.length === 0 ? (
          <EmptyState icon="📚" title="No modules yet" description="Modules will appear here once added" />
        ) : (
          <div className="flex flex-col gap-3">
            {modules.map((mod, index) => (
              <Card key={mod._id}>
                {/* Module header */}
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === mod._id ? null : mod._id)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                    <PlayCircle size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-600">MODULE {String(index + 1).padStart(2,'0')}</span>
                      {(mod.resources || []).length > 0 && (
                        <span className="text-xs font-mono text-slate-600">· {mod.resources.length} resources</span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm">{mod.title}</h3>
                    {mod.description && <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>}
                  </div>
                  <ChevronRight size={16} className={`text-slate-600 transition-transform flex-shrink-0 ${expanded === mod._id ? 'rotate-90' : ''}`} />
                </div>

                {/* Expanded resources */}
                {expanded === mod._id && (
                  <div className="border-t border-[#1c2a42] px-5 py-4">
                    {(mod.resources || []).length === 0 ? (
                      <p className="text-slate-600 text-sm">No resources added yet</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {mod.resources.map((r, j) => (
                          <a
                            key={j}
                            href={r.url !== '#' ? r.url : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 p-3 rounded-lg border border-[#1c2a42] transition-all ${r.url !== '#' ? 'hover:border-slate-600 hover:bg-white/[0.02] cursor-pointer' : 'opacity-50 cursor-default'}`}
                          >
                            <span className="flex-shrink-0">{resourceIcon(r.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-200 font-medium truncate">{r.title}</div>
                              {r.duration && <div className="text-xs text-slate-500 font-mono mt-0.5">{r.duration}</div>}
                              {r.description && <div className="text-xs text-slate-600 mt-0.5">{r.description}</div>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-mono font-bold uppercase ${resourceColor(r.type)}`}>{r.type}</span>
                              {r.url !== '#' && <ExternalLink size={12} className="text-slate-600" />}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}