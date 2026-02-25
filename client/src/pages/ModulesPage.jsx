// ============================================================
//  pages/ModulesPage.jsx  —  Learning Path + MCQ Quiz
// ============================================================
import { useState, useEffect } from 'react'
import { cohortAPI } from '../api'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/layout/AppLayout'
import { Card, Button, Badge, LoadingScreen, EmptyState } from '../components/ui'
import { Lock, CheckCircle, PlayCircle, ExternalLink, BookOpen, ChevronRight, X, AlertCircle } from 'lucide-react'
import axios from '../api/axios'

// ── MCQ QUIZ MODAL ────────────────────────────────────────
function QuizModal({ module, onClose, onPassed }) {
  const [questions, setQuestions]   = useState([])
  const [answers,   setAnswers]     = useState({}) // { questionId: selectedOptionIndex }
  const [result,    setResult]      = useState(null)
  const [loading,   setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [current,   setCurrent]     = useState(0)

  useEffect(() => {
    axios.get(`/cohorts/modules/${module._id}/questions`).then(({ data }) => {
      setQuestions(data.data.questions)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [module._id])

  const handleSelect = (questionId, optionIndex) => {
    if (result) return // don't allow changes after submit
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert(`Please answer all ${questions.length} questions before submitting.`)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
          questionId, selectedOption
        }))
      }
      const { data } = await axios.post(`/cohorts/modules/${module._id}/submit`, payload)
      setResult(data.data)
      if (data.data.passed) onPassed()
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const answeredCount = Object.keys(answers).length
  const progress      = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0f1623] border border-[#1c2a42] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-[#1c2a42] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white">{module.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Pass score: {module.minPassScore}% · {questions.length} questions
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        {!result && (
          <div className="px-5 pt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{answeredCount} of {questions.length} answered</span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-[#1c2a42] rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full spin" />
            </div>
          ) : result ? (
            // ── RESULTS VIEW ──────────────────────────────
            <div className="flex flex-col items-center text-center py-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 ${result.passed ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                {result.passed ? '🎉' : '😔'}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                {result.score}%
              </h3>
              <p className="text-white font-semibold mb-1">{result.message}</p>
              <p className="text-slate-500 text-sm mb-6">
                {result.earnedPoints} / {result.totalPoints} points
              </p>

              {/* Answer breakdown */}
              <div className="w-full text-left flex flex-col gap-2 mb-6">
                {questions.map((q, i) => {
                  const graded = result.gradedAnswers?.find(a => a.questionId === q._id)
                  return (
                    <div key={q._id} className={`p-3 rounded-lg border text-sm ${graded?.isCorrect ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                      <div className="flex items-start gap-2">
                        {graded?.isCorrect
                          ? <CheckCircle size={15} className="text-green-400 mt-0.5 flex-shrink-0" />
                          : <X size={15} className="text-red-400 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className="text-slate-300 font-medium mb-1">{q.title}</p>
                          {!graded?.isCorrect && (
                            <>
                              <p className="text-xs text-red-400">Your answer: {q.options[graded?.selectedOption]?.text || 'Not answered'}</p>
                              <p className="text-xs text-green-400">Correct: {q.options[graded?.correctOption]?.text}</p>
                              {q.explanation && <p className="text-xs text-slate-500 mt-1 italic">{q.explanation}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3">
                {!result.passed && (
                  <Button variant="secondary" onClick={() => { setResult(null); setAnswers({}); setCurrent(0) }}>
                    Try Again
                  </Button>
                )}
                <Button onClick={onClose}>
                  {result.passed ? 'Continue Learning →' : 'Close'}
                </Button>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <AlertCircle size={32} className="text-amber-400" />
              <p className="text-slate-400">No questions assigned to this module yet.</p>
              <p className="text-slate-600 text-sm">Questions will be added in a future update.</p>
            </div>
          ) : (
            // ── QUESTION VIEW ─────────────────────────────
            <div>
              {/* Question navigator dots */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all ${
                      i === current        ? 'bg-blue-600 text-white' :
                      answers[q._id] !== undefined ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            'bg-[#151e30] text-slate-500 border border-[#1c2a42]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Current question */}
              {questions[current] && (
                <div className="fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-slate-500">Q{current + 1}/{questions.length}</span>
                    <Badge color={questions[current].difficulty === 'easy' ? 'green' : questions[current].difficulty === 'medium' ? 'amber' : 'red'}>
                      {questions[current].difficulty}
                    </Badge>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{questions[current].title}</h3>
                  <p className="text-slate-400 text-sm mb-5 leading-relaxed">{questions[current].description}</p>

                  <div className="flex flex-col gap-2">
                    {questions[current].options?.map((opt, idx) => {
                      const isSelected = answers[questions[current]._id] === idx
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelect(questions[current]._id, idx)}
                          className={`w-full p-4 rounded-xl border text-left text-sm transition-all duration-150 ${
                            isSelected
                              ? 'border-blue-500/50 bg-blue-500/10 text-white'
                              : 'border-[#1c2a42] bg-[#151e30] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                          }`}
                        >
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold font-mono mr-3 ${isSelected ? 'bg-blue-600 text-white' : 'bg-[#1c2a42] text-slate-500'}`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt.text}
                        </button>
                      )
                    })}
                  </div>

                  {/* Next/Prev navigation */}
                  <div className="flex justify-between mt-5">
                    <Button variant="ghost" size="sm" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                      ← Previous
                    </Button>
                    {current < questions.length - 1 ? (
                      <Button variant="secondary" size="sm" onClick={() => setCurrent(c => c + 1)}>
                        Next →
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} loading={submitting}
                        className={answeredCount < questions.length ? 'opacity-60' : ''}>
                        Submit Assessment
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MAIN MODULES PAGE ─────────────────────────────────────
export default function ModulesPage() {
  const { user, setUser } = useAuthStore()
  const [modules,  setModules]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [quiz,     setQuiz]     = useState(null) // module to quiz on

  const cohortId = typeof user?.cohort === 'object' ? user.cohort._id : user?.cohort

  const fetchModules = () => {
    if (!cohortId) return setLoading(false)
    cohortAPI.getModules(cohortId).then(({ data }) => {
      setModules(data.data.modules)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchModules() }, [cohortId])

  const handleModulePassed = () => {
    // Refresh modules to show newly unlocked one
    fetchModules()
    // Also update user's completedModules in store
    setUser({ ...user, completedModules: [...(user.completedModules || []), quiz._id] })
  }

  if (loading) return <LoadingScreen />

  const cohortName = typeof user?.cohort === 'object' ? user.cohort.name : 'Your Cohort'
  const cohortIcon = typeof user?.cohort === 'object' ? user.cohort.icon : '📚'
  const completed  = modules.filter(m => m.isCompleted).length

  return (
    <AppLayout>
      {quiz && (
        <QuizModal
          module={quiz}
          onClose={() => setQuiz(null)}
          onPassed={handleModulePassed}
        />
      )}

      <div className="fade-in">
        <div className="mb-6">
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Learning Path</p>
          <h1 className="text-2xl font-bold text-white">{cohortIcon} {cohortName}</h1>
          <p className="text-slate-500 text-sm mt-1">{completed} / {modules.length} modules completed</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#1c2a42] rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${modules.length ? (completed / modules.length) * 100 : 0}%` }}
          />
        </div>

        {modules.length === 0 ? (
          <EmptyState icon="📚" title="No modules yet" description="Modules will appear here once added" />
        ) : (
          <div className="flex flex-col gap-4">
            {modules.map((mod) => (
              <Card
                key={mod._id}
                accent={mod.isCompleted ? '#22c55e' : mod.isLocked ? undefined : '#3b82f6'}
                className={mod.isLocked ? 'opacity-55' : ''}
              >
                {/* Module header */}
                <div
                  className={`p-5 flex items-center gap-4 ${!mod.isLocked ? 'cursor-pointer' : ''}`}
                  onClick={() => !mod.isLocked && setExpanded(expanded === mod._id ? null : mod._id)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    mod.isCompleted ? 'bg-green-500/15 text-green-400' :
                    mod.isLocked    ? 'bg-[#1c2a42] text-slate-600' :
                                      'bg-blue-500/15 text-blue-400'
                  }`}>
                    {mod.isCompleted ? <CheckCircle size={20} /> :
                     mod.isLocked    ? <Lock size={18} /> :
                                       <PlayCircle size={20} />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-600">MODULE {String(mod.order).padStart(2,'0')}</span>
                      {mod.isCompleted && <Badge color="green">Completed ✓</Badge>}
                      {!mod.isCompleted && !mod.isLocked && <Badge color="blue">Available</Badge>}
                      {mod.isLocked && <Badge color="slate">Locked</Badge>}
                      {mod.hasQuestions && !mod.isLocked && (
                        <Badge color="purple">{mod.questionCount} questions</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm">{mod.title}</h3>
                    {mod.description && <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>}
                  </div>

                  {!mod.isLocked && (
                    <ChevronRight size={16} className={`text-slate-600 transition-transform ${expanded === mod._id ? 'rotate-90' : ''}`} />
                  )}
                </div>

                {/* Expanded: resources + assessment button */}
                {expanded === mod._id && (
                  <div className="border-t border-[#1c2a42] px-5 py-4">
                    {/* Resources */}
                    {mod.resources?.length > 0 && (
                      <div className="flex flex-col gap-2 mb-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Study Materials</p>
                        {mod.resources.map((r, j) => {
                          const typeStyles = {
                            video:   { icon: '▶️', cls: 'text-red-300'    },
                            notes:   { icon: '📄', cls: 'text-blue-300'   },
                            article: { icon: '📰', cls: 'text-amber-300'  },
                            project: { icon: '🛠️', cls: 'text-purple-300' },
                          }
                          const style = typeStyles[r.type] || typeStyles.notes
                          return (
                            <a key={j} href={r.url !== '#' ? r.url : undefined}
                               target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-3 p-3 rounded-lg border border-[#1c2a42] hover:border-slate-600 transition-all">
                              <span className="text-sm">{style.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-slate-200 font-medium truncate">{r.title}</div>
                                {r.duration && <div className="text-xs text-slate-500 font-mono">{r.duration}</div>}
                              </div>
                              <span className={`text-xs font-mono font-bold ${style.cls}`}>{r.type}</span>
                              {r.url !== '#' && <ExternalLink size={13} className="text-slate-600 flex-shrink-0" />}
                            </a>
                          )
                        })}
                      </div>
                    )}

                    {/* Assessment */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#1c2a42]">
                      <div>
                        <p className="text-sm text-slate-300 font-medium">
                          {mod.isCompleted ? '✅ Assessment passed!' : '📝 Module Assessment'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {mod.isCompleted
                            ? 'Next module is unlocked'
                            : `Pass ${mod.minPassScore}% to unlock next module · ${mod.questionCount || 0} MCQ questions`}
                        </p>
                      </div>
                      {!mod.isCompleted && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); setQuiz(mod) }}
                          disabled={!mod.hasQuestions}
                          variant={mod.hasQuestions ? 'primary' : 'secondary'}
                          size="sm"
                        >
                          <BookOpen size={14} />
                          {mod.hasQuestions ? 'Take Quiz' : 'No questions yet'}
                        </Button>
                      )}
                    </div>
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